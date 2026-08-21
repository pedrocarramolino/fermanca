import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { cancelQstashMessage, scheduleSessionPhaseAlert } from "@/core/infrastructure/qstash/client";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import type { CategoryId, SessionBlockId, SessionId, UserId } from "@/core/domain/ids";
import type { SessionEventType } from "@/core/domain/session-event";

type Client = SupabaseClient<Database>;

const EVENT_NOTICE_TEXT: Record<SessionEventType, (name: string) => { title: string; body: string }> = {
  paused: (name) => ({ title: "Sesión en pausa", body: `${name} ha pausado la fase.` }),
  resumed: (name) => ({ title: "Sesión reanudada", body: `${name} ha reanudado la fase.` }),
  phase_confirmed: (name) => ({ title: "Nueva fase", body: `${name} ha pasado a la siguiente fase.` }),
  time_extended: (name) => ({ title: "Más tiempo", body: `${name} ha pedido más tiempo para la fase.` }),
  phase_added: (name) => ({ title: "Fase añadida", body: `${name} ha añadido una fase a la sesión.` }),
  phases_reordered: (name) => ({
    title: "Fases reordenadas",
    body: `${name} ha reordenado las fases pendientes.`,
  }),
  phase_removed: (name) => ({ title: "Fase eliminada", body: `${name} ha eliminado una fase pendiente.` }),
  session_finished: (name) => ({ title: "Sesión terminada", body: `${name} ha terminado la sesión.` }),
};

export interface CoopPeer {
  peerSessionId: SessionId;
  peerOwnerId: UserId;
  peerRepo: SupabaseSessionRepository;
  serviceClient: Client;
}

/**
 * Si la sesión que actúa tiene una gemela enlazada (sesión cooperativa),
 * devuelve lo necesario para replicar en ella — null si es una sesión
 * normal, en solitario, que es el caso común y no debe pagar ningún coste
 * extra más allá de este único lookup barato.
 */
export async function getCoopPeer(
  sessionId: SessionId,
  userId: UserId,
  client: Client,
): Promise<CoopPeer | null> {
  const peerSessionId = await new SupabaseSessionRepository(client).getLinkedSessionId(
    sessionId,
    userId,
  );
  if (!peerSessionId) return null;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("sessions")
    .select("owner_id")
    .eq("id", peerSessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    peerSessionId,
    peerOwnerId: data.owner_id as UserId,
    peerRepo: new SupabaseSessionRepository(serviceClient),
    serviceClient,
  };
}

/**
 * Traduce ids de bloque de la sesión propia a los de la sesión gemela por
 * POSICIÓN, no por id — los ids son distintos en cada sesión, pero las
 * posiciones son idénticas por construcción (se crean con los mismos
 * bloques, en el mismo orden, en acceptSessionInvite). Se llama siempre
 * ANTES de mutar nada localmente: insertar/reordenar cambia posiciones, así
 * que resolver la correspondencia después podría emparejar el bloque
 * equivocado.
 */
export async function resolvePeerBlockIds(
  client: Client,
  peer: CoopPeer,
  localBlockIds: SessionBlockId[],
): Promise<Map<SessionBlockId, SessionBlockId>> {
  const positions = await new SupabaseSessionRepository(client).getBlockPositions(localBlockIds);
  const peerBlocks = await peer.peerRepo.findBlockIdsAtPositions(
    peer.peerSessionId,
    positions.map((p) => p.position),
  );
  const peerIdByPosition = new Map(peerBlocks.map((b) => [b.position, b.id] as const));

  const result = new Map<SessionBlockId, SessionBlockId>();
  for (const { id, position } of positions) {
    const peerId = peerIdByPosition.get(position);
    if (peerId) result.set(id, peerId);
  }
  return result;
}

/** Registra en el feed en vivo de las DOS sesiones — el propio dispositivo
 * ignora su propio evento (compara actorId), el del compañero lo muestra
 * como aviso. Se deja fallar (no se traga el error): si esto falla, mejor
 * saberlo que dejar al compañero sin enterarse en silencio. */
export async function recordCoopEvent(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  actorId: UserId,
  actorUsername: string,
  type: SessionEventType,
): Promise<void> {
  const [ownResult, peerResult] = await Promise.all([
    client.from("session_events").insert({
      session_id: sessionId,
      actor_id: actorId,
      actor_username: actorUsername,
      type,
    }),
    peer.serviceClient.from("session_events").insert({
      session_id: peer.peerSessionId,
      actor_id: actorId,
      actor_username: actorUsername,
      type,
    }),
  ]);
  if (ownResult.error) throw ownResult.error;
  if (peerResult.error) throw peerResult.error;

  // El push es un extra sobre el aviso en vivo (por si el compañero no
  // tiene la app abierta en ese momento) — un fallo aquí no debe tumbar la
  // acción que ya se guardó correctamente.
  await notifyCoopPeer(peer, type, actorUsername).catch((error: unknown) => {
    console.error("No se pudo avisar por push del evento cooperativo", error);
  });
}

async function notifyCoopPeer(
  peer: CoopPeer,
  type: SessionEventType,
  actorUsername: string,
): Promise<void> {
  const { title, body } = EVENT_NOTICE_TEXT[type](actorUsername);
  const { data: subscriptions, error } = await peer.serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", peer.peerOwnerId);
  if (error) throw error;

  const pushRepo = new SupabasePushSubscriptionRepository(peer.serviceClient);
  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { kind: "session-coop-notice", title, body, sessionId: peer.peerSessionId },
    );
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }
}

/** Réplica de confirmar/terminar una fase — ver transitionBlock. Cada
 * escritura, propia y replicada, pasa por transitionBlockIfStatus (no
 * updateBlock a secas): si los dos dispositivos confirman la misma fase
 * casi a la vez, la segunda escritura en llegar encuentra 0 filas (el
 * estado ya cambió) y se trata como "el compañero ya lo hizo", sin duplicar
 * el aviso QStash ni el evento. */
export async function mirrorTransition(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  userId: UserId,
  actorUsername: string,
  input: {
    completedBlocks: { id: SessionBlockId; actualDurationSeconds: number }[];
    completedAtIso: string;
    nextBlockId: SessionBlockId | null;
    nextBlockPlannedDurationSeconds?: number;
    nextStartedAtIso: string;
  },
): Promise<void> {
  const localIds = [
    ...input.completedBlocks.map((b) => b.id),
    ...(input.nextBlockId ? [input.nextBlockId] : []),
  ];
  const peerIdByLocalId = await resolvePeerBlockIds(client, peer, localIds);

  for (const block of input.completedBlocks) {
    const peerBlockId = peerIdByLocalId.get(block.id);
    if (!peerBlockId) continue;

    const pendingMessageId = await peer.peerRepo.getBlockQstashMessageId(peerBlockId);
    if (pendingMessageId) await cancelQstashMessage(pendingMessageId);

    await peer.peerRepo.transitionBlockIfStatus(peerBlockId, peer.peerOwnerId, "active", {
      status: "completed",
      endedAt: new Date(input.completedAtIso),
      actualDurationSeconds: block.actualDurationSeconds,
    });
  }

  if (input.nextBlockId) {
    const peerNextId = peerIdByLocalId.get(input.nextBlockId);
    if (peerNextId) {
      const activated = await peer.peerRepo.transitionBlockIfStatus(
        peerNextId,
        peer.peerOwnerId,
        "pending",
        { status: "active", startedAt: new Date(input.nextStartedAtIso) },
      );
      // null → el compañero ya activó su propio bloque siguiente por su
      // cuenta (y ya programó su propio aviso QStash al hacerlo) — no hay
      // nada más que replicar aquí.
      if (activated && input.nextBlockPlannedDurationSeconds != null) {
        const messageId = await scheduleSessionPhaseAlert(
          peerNextId,
          input.nextBlockPlannedDurationSeconds,
        );
        await peer.peerRepo.setBlockQstashMessageId(peerNextId, messageId);
      }
    }
    await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "phase_confirmed");
  } else {
    await peer.peerRepo.finish(peer.peerSessionId, peer.peerOwnerId, {
      status: "completed",
      finalNote: null,
    });
    await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "session_finished");
  }
}

export async function mirrorExtend(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  userId: UserId,
  actorUsername: string,
  blockId: SessionBlockId,
  extraSeconds: number,
): Promise<void> {
  const peerBlockId = (await resolvePeerBlockIds(client, peer, [blockId])).get(blockId);
  if (!peerBlockId) return;

  const pendingMessageId = await peer.peerRepo.getBlockQstashMessageId(peerBlockId);
  if (pendingMessageId) await cancelQstashMessage(pendingMessageId);
  const messageId = await scheduleSessionPhaseAlert(peerBlockId, extraSeconds);
  await peer.peerRepo.extendBlock(peerBlockId, peer.peerOwnerId, extraSeconds, messageId);

  await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "time_extended");
}

export async function mirrorPause(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  userId: UserId,
  actorUsername: string,
  blockId: SessionBlockId,
  remainingSeconds: number,
): Promise<void> {
  const peerBlockId = (await resolvePeerBlockIds(client, peer, [blockId])).get(blockId);
  if (!peerBlockId) return;

  const pendingMessageId = await peer.peerRepo.getBlockQstashMessageId(peerBlockId);
  if (pendingMessageId) await cancelQstashMessage(pendingMessageId);
  await peer.peerRepo.setBlockQstashMessageId(peerBlockId, null);
  await peer.peerRepo.setBlockPausedRemainingSeconds(peerBlockId, Math.round(remainingSeconds));

  await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "paused");
}

export async function mirrorResume(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  userId: UserId,
  actorUsername: string,
  blockId: SessionBlockId,
  newStartedAtIso: string,
  remainingSeconds: number,
): Promise<void> {
  const peerBlockId = (await resolvePeerBlockIds(client, peer, [blockId])).get(blockId);
  if (!peerBlockId) return;

  const messageId = await scheduleSessionPhaseAlert(peerBlockId, remainingSeconds);
  await peer.peerRepo.updateBlock(peerBlockId, peer.peerOwnerId, {
    startedAt: new Date(newStartedAtIso),
  });
  await peer.peerRepo.setBlockQstashMessageId(peerBlockId, messageId);
  await peer.peerRepo.setBlockPausedRemainingSeconds(peerBlockId, null);

  await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "resumed");
}

/** A diferencia de las anteriores, esta se llama ANTES de la mutación local
 * (ver insertSessionBlock): si el bloque de referencia existe, resuelve su
 * gemelo por posición mientras las posiciones de ambas sesiones todavía
 * coinciden exactamente. */
export async function resolveCoopInsertTarget(
  client: Client,
  sessionId: SessionId,
  userId: UserId,
  beforeBlockId: SessionBlockId | null,
): Promise<{ peer: CoopPeer; peerBeforeBlockId: SessionBlockId | null } | null> {
  const peer = await getCoopPeer(sessionId, userId, client);
  if (!peer) return null;
  if (!beforeBlockId) return { peer, peerBeforeBlockId: null };

  const peerBeforeBlockId = (await resolvePeerBlockIds(client, peer, [beforeBlockId])).get(
    beforeBlockId,
  );
  return { peer, peerBeforeBlockId: peerBeforeBlockId ?? null };
}

export async function mirrorInsertBlock(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  userId: UserId,
  actorUsername: string,
  peerBeforeBlockId: SessionBlockId | null,
  input: {
    categoryId: CategoryId;
    name: string;
    color: string;
    plannedDurationSeconds: number;
  },
): Promise<void> {
  await peer.peerRepo.insertBlock(peer.peerSessionId, peer.peerOwnerId, {
    categoryId: input.categoryId,
    name: input.name,
    color: input.color,
    plannedDurationSeconds: input.plannedDurationSeconds,
    beforeBlockId: peerBeforeBlockId,
  });
  await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "phase_added");
}

/** También se resuelve ANTES de la mutación local, por el mismo motivo que
 * resolveCoopInsertTarget: reordenar cambia posiciones. */
export async function resolveCoopReorderTarget(
  client: Client,
  sessionId: SessionId,
  userId: UserId,
  orderedBlockIds: SessionBlockId[],
): Promise<{ peer: CoopPeer; peerOrderedBlockIds: SessionBlockId[] } | null> {
  const peer = await getCoopPeer(sessionId, userId, client);
  if (!peer) return null;

  const peerIdByLocalId = await resolvePeerBlockIds(client, peer, orderedBlockIds);
  const peerOrderedBlockIds = orderedBlockIds
    .map((id) => peerIdByLocalId.get(id))
    .filter((id): id is SessionBlockId => id != null);

  // Si no se pudo resolver algún bloque (no debería pasar, las dos sesiones
  // se crean con el mismo número de bloques), mejor no reordenar la del
  // compañero a medias que dejarla con un orden distinto al propio.
  if (peerOrderedBlockIds.length !== orderedBlockIds.length) return null;

  return { peer, peerOrderedBlockIds };
}

export async function mirrorReorderBlocks(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  userId: UserId,
  actorUsername: string,
  peerOrderedBlockIds: SessionBlockId[],
): Promise<void> {
  await peer.peerRepo.reorderBlocks(peer.peerSessionId, peer.peerOwnerId, peerOrderedBlockIds);
  await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "phases_reordered");
}

/** Se resuelve ANTES de borrar localmente, por el mismo motivo que las
 * anteriores — aunque borrar no desplaza posiciones, mantiene el mismo
 * orden de operaciones que insertar/reordenar por consistencia. */
export async function resolveCoopDeleteTarget(
  client: Client,
  sessionId: SessionId,
  userId: UserId,
  blockId: SessionBlockId,
): Promise<{ peer: CoopPeer; peerBlockId: SessionBlockId } | null> {
  const peer = await getCoopPeer(sessionId, userId, client);
  if (!peer) return null;

  const peerBlockId = (await resolvePeerBlockIds(client, peer, [blockId])).get(blockId);
  if (!peerBlockId) return null;

  return { peer, peerBlockId };
}

export async function mirrorDeleteBlock(
  client: Client,
  peer: CoopPeer,
  sessionId: SessionId,
  userId: UserId,
  actorUsername: string,
  peerBlockId: SessionBlockId,
): Promise<void> {
  await peer.peerRepo.deleteBlock(peerBlockId, peer.peerOwnerId);
  await recordCoopEvent(client, peer, sessionId, userId, actorUsername, "phase_removed");
}
