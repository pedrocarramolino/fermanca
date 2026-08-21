"use server";

import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseTemplateRepository } from "@/core/infrastructure/supabase/repositories/template-repository";
import { SupabaseCategoryRepository } from "@/core/infrastructure/supabase/repositories/category-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import { currentStreakDays, practiceSecondsByDay } from "@/core/domain/streaks";
import type { CategoryId, SessionBlockId, SessionId, UserId } from "@/core/domain/ids";
import {
  cancelQstashMessage,
  scheduleSessionPhaseAlert,
} from "@/core/infrastructure/qstash/client";
import {
  getCoopPeer,
  mirrorDeleteBlock,
  mirrorExtend,
  mirrorInsertBlock,
  mirrorPause,
  mirrorReorderBlocks,
  mirrorResume,
  mirrorTransition,
  resolveCoopDeleteTarget,
  resolveCoopInsertTarget,
  resolveCoopReorderTarget,
} from "@/features/session-timer/application/coop-mirror";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Solo se pide si de verdad hay una sesión gemela enlazada — la mayoría de
 * las sesiones son en solitario y no deben pagar este lookup de perfil. */
async function actorUsername(client: Client, userId: UserId): Promise<string> {
  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  return profile?.username ?? "";
}

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

/**
 * Cierra el bloque activo (completado) y abre el siguiente. Se llama solo
 * tras confirmación explícita del usuario (ver useSessionRuntime) — los
 * bloques ya no se saltan solos por tiempo, así que `completedBlocks` es
 * siempre de uno en la práctica, pero se deja como array por si algún día
 * hace falta cerrar varios de golpe.
 */
export async function transitionBlock(input: {
  sessionId: string;
  completedBlocks: { id: string; actualDurationSeconds: number }[];
  /** Instante en que la fase cerrada realmente terminó (agotó su tiempo, se
   * pausó o se forzó su fin) — no cuándo se confirmó, que puede ser bastante
   * después. */
  completedAt: string;
  nextBlockId: string | null;
  nextBlockPlannedDurationSeconds?: number;
  /** Instante en que empieza a contar la siguiente fase: el click real de
   * confirmación, no `completedAt` — si no, el rato que se tardó en confirmar
   * se restaría también del tiempo de la fase siguiente. */
  nextStartedAt: string;
}) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);
  const sessionId = input.sessionId as SessionId;

  for (const block of input.completedBlocks) {
    // Se confirmó a mano antes de que llegara el aviso programado — se
    // cancela para que no llegue después un push de una fase que ya se
    // cerró.
    const pendingMessageId = await repo.getBlockQstashMessageId(block.id as SessionBlockId);
    if (pendingMessageId) await cancelQstashMessage(pendingMessageId);

    // transitionBlockIfStatus, no updateBlock a secas: en una sesión
    // cooperativa, la réplica del compañero puede llegar a esta misma fila
    // justo antes que esta escritura "local" — si el bloque ya no está
    // 'active', alguien ya hizo esta transición, no hay nada más que hacer.
    await repo.transitionBlockIfStatus(block.id as SessionBlockId, userId, "active", {
      status: "completed",
      endedAt: new Date(input.completedAt),
      actualDurationSeconds: block.actualDurationSeconds,
    });
  }
  if (input.nextBlockId) {
    const activated = await repo.transitionBlockIfStatus(
      input.nextBlockId as SessionBlockId,
      userId,
      "pending",
      { status: "active", startedAt: new Date(input.nextStartedAt) },
    );
    if (activated && input.nextBlockPlannedDurationSeconds != null) {
      const messageId = await scheduleSessionPhaseAlert(
        input.nextBlockId,
        input.nextBlockPlannedDurationSeconds,
      );
      await repo.setBlockQstashMessageId(input.nextBlockId as SessionBlockId, messageId);
    }
  }

  const peer = await getCoopPeer(sessionId, userId, client);
  if (peer) {
    await mirrorTransition(client, peer, sessionId, userId, await actorUsername(client, userId), {
      completedBlocks: input.completedBlocks.map((b) => ({
        id: b.id as SessionBlockId,
        actualDurationSeconds: b.actualDurationSeconds,
      })),
      completedAtIso: input.completedAt,
      nextBlockId: input.nextBlockId as SessionBlockId | null,
      nextBlockPlannedDurationSeconds: input.nextBlockPlannedDurationSeconds,
      nextStartedAtIso: input.nextStartedAt,
    });
  }
}

/**
 * El usuario pide más tiempo para la fase que acaba de terminar en vez de
 * pasar a la siguiente — cancela el aviso QStash ya vencido (si sigue sin
 * entregarse) y programa uno nuevo para el plazo ampliado, para que el
 * aviso de fin de fase siga llegando aunque el móvil esté bloqueado.
 */
export async function extendActiveBlock(sessionId: string, blockId: string, extraSeconds: number) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const pendingMessageId = await repo.getBlockQstashMessageId(blockId as SessionBlockId);
  if (pendingMessageId) await cancelQstashMessage(pendingMessageId);

  const messageId = await scheduleSessionPhaseAlert(blockId, extraSeconds);
  await repo.extendBlock(blockId as SessionBlockId, userId, extraSeconds, messageId);

  const peer = await getCoopPeer(sessionId as SessionId, userId, client);
  if (peer) {
    await mirrorExtend(
      client,
      peer,
      sessionId as SessionId,
      userId,
      await actorUsername(client, userId),
      blockId as SessionBlockId,
      extraSeconds,
    );
  }
}

/**
 * El usuario pausa el bloque activo — se cancela el aviso QStash pendiente
 * para que no llegue un "fin de fase" mientras el cronómetro está parado, y
 * se guarda cuánto quedaba en ese instante: sin esto, recargar la página o
 * volver más tarde recalcularía el tiempo restante desde `started_at` como
 * si hubiera seguido corriendo mientras se estaba fuera. Se libera al
 * reanudar (ver resumeActiveBlock).
 */
export async function pauseActiveBlock(
  sessionId: string,
  blockId: string,
  remainingSeconds: number,
) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const pendingMessageId = await repo.getBlockQstashMessageId(blockId as SessionBlockId);
  if (pendingMessageId) await cancelQstashMessage(pendingMessageId);
  await repo.setBlockQstashMessageId(blockId as SessionBlockId, null);
  await repo.setBlockPausedRemainingSeconds(blockId as SessionBlockId, Math.round(remainingSeconds));

  const peer = await getCoopPeer(sessionId as SessionId, userId, client);
  if (peer) {
    await mirrorPause(
      client,
      peer,
      sessionId as SessionId,
      userId,
      await actorUsername(client, userId),
      blockId as SessionBlockId,
      remainingSeconds,
    );
  }
}

/**
 * Reanuda un bloque pausado: `newStartedAt` ya viene desplazado por el
 * tiempo que ha estado en pausa (ver useSessionRuntime), así que persistirlo
 * mantiene el cálculo de elapsed/remaining correcto tras un refresco. El
 * aviso de fin de fase se reprograma para lo que quedaba, no para la
 * duración completa de la fase, y se libera la marca de pausa.
 */
export async function resumeActiveBlock(
  sessionId: string,
  blockId: string,
  newStartedAt: string,
  remainingSeconds: number,
) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const messageId = await scheduleSessionPhaseAlert(blockId, remainingSeconds);
  await repo.updateBlock(blockId as SessionBlockId, userId, { startedAt: new Date(newStartedAt) });
  await repo.setBlockQstashMessageId(blockId as SessionBlockId, messageId);
  await repo.setBlockPausedRemainingSeconds(blockId as SessionBlockId, null);

  const peer = await getCoopPeer(sessionId as SessionId, userId, client);
  if (peer) {
    await mirrorResume(
      client,
      peer,
      sessionId as SessionId,
      userId,
      await actorUsername(client, userId),
      blockId as SessionBlockId,
      newStartedAt,
      remainingSeconds,
    );
  }
}

/**
 * Relee los bloques desde la BD tal cual quedaron. Se usa justo cuando la
 * sesión en vivo termina, para que las notas guardadas durante la marcha
 * (que el estado local del cliente nunca vio) aparezcan en el resumen sin
 * tener que recargar la página.
 */
export async function getFreshBlocks(sessionId: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);
  const session = await repo.getById(sessionId as SessionId, userId);
  if (!session) throw new Error("Sesión no encontrada.");
  return session.blocks.map((block) => ({
    id: block.id,
    name: block.name,
    color: block.color,
    categoryId: block.categoryId,
    plannedDurationSeconds: block.plannedDurationSeconds,
    actualDurationSeconds: block.actualDurationSeconds,
    note: block.note,
    pausedRemainingSeconds: block.pausedRemainingSeconds,
    // status/startedAt: SessionSummary (la única consumidora original de
    // esta acción) los sobreescribe siempre a mano ("completed"/null) al
    // usarlos — se incluyen tal cual para que CoopSessionRunner también
    // pueda recalcular el estado en vivo del cronómetro tras un evento de
    // Realtime, sin necesitar una segunda acción casi idéntica.
    status: block.status,
    startedAt: block.startedAt ? block.startedAt.toISOString() : null,
  }));
}

/** IDs de las categorías personalizadas marcadas como "fantasma" — sus
 * bloques se excluyen del resumen final y de la imagen para compartir (ver
 * SessionSummary). Se consulta en vivo, no se guarda una copia en el bloque:
 * si el usuario cambia la marca después, el resumen de una sesión ya
 * terminada refleja el estado actual de la categoría, no el de cuando se
 * creó el bloque. */
export async function listGhostCategoryIds(): Promise<string[]> {
  const { userId, client } = await requireUserId();
  const categories = await new SupabaseCategoryRepository(client).listAvailable(userId);
  return categories.filter((c) => c.kind === "custom" && c.isGhost).map((c) => c.id);
}

/** Hora a la que empezó la sesión — se usa en la Story con foto. Se lee de
 * `sessions.started_at`, no del primer bloque: es fiable desde el instante
 * en que se crea la sesión, mientras que `endedAt` a nivel de sesión aún no
 * existe si el usuario abre la Story antes de guardar la nota final (ver
 * finishSession), así que la hora de fin se aproxima con "ahora" en el
 * propio creador de la Story en vez de depender de aquí. */
export async function getSessionStartedAt(sessionId: string): Promise<string | null> {
  const { userId, client } = await requireUserId();
  const sessionRepo = new SupabaseSessionRepository(client);
  const session = await sessionRepo.getById(sessionId as SessionId, userId);
  return session ? session.startedAt.toISOString() : null;
}

/** Nombre de la rutina de la que viene la sesión, si se creó a partir de
 * una — se usa en la Story con foto; las sesiones improvisadas (sin
 * plantilla) no tienen nombre, así que devuelve null y esa línea se omite. */
export async function getSessionTemplateName(sessionId: string): Promise<string | null> {
  const { userId, client } = await requireUserId();
  const sessionRepo = new SupabaseSessionRepository(client);
  const session = await sessionRepo.getById(sessionId as SessionId, userId);
  if (!session?.templateId) return null;
  const templateRepo = new SupabaseTemplateRepository(client);
  const template = await templateRepo.getById(session.templateId, userId);
  return template?.name ?? null;
}

/** Username del amigo con quien se hizo la sesión, si era cooperativa — se
 * usa en la Story con foto para que se note con quién se practicó. Sesiones
 * normales (sin `linked_session_id`) devuelven null y esa línea se omite. */
export async function getSessionPeerUsername(sessionId: string): Promise<string | null> {
  const { userId, client } = await requireUserId();
  const sessionRepo = new SupabaseSessionRepository(client);
  const session = await sessionRepo.getById(sessionId as SessionId, userId);
  return session?.linkedSessionPeerUsername ?? null;
}

/** Para el texto del botón de compartir — "racha de N días" es más
 * motivador que solo el tiempo practicado, así que se calcula aparte
 * (mismo cálculo que la pantalla de Rachas) en vez de mandarlo desde el
 * runtime en memoria, que no conoce el resto del historial. */
export async function getCurrentStreakDays(): Promise<number> {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);
  const sessions = await repo.listByOwner(userId, { limit: 1000 });
  return currentStreakDays(practiceSecondsByDay(sessions), new Date());
}

export async function saveBlockNote(blockId: string, note: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);
  await repo.updateBlock(blockId as SessionBlockId, userId, { note: note || null });
}

export async function finishSession(sessionId: string, finalNote: string | null) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);
  return repo.finish(sessionId as SessionId, userId, { status: "completed", finalNote });
}

/** Categorías para el selector de "añadir fase" en la pantalla de fin de
 * fase — mismo listado que al montar la sesión, pero pedido aparte porque
 * SessionRunner no las recibe por props (la sesión ya está en marcha). */
export async function listSessionCategories() {
  const { userId, client } = await requireUserId();
  return new SupabaseCategoryRepository(client).listAvailable(userId);
}

/**
 * Añade una fase nueva a una sesión en marcha, en la posición que elija el
 * usuario entre las que aún no han empezado — `beforeBlockId: null` la deja
 * al final. Rechaza sesiones que ya no estén en curso (terminadas o
 * abandonadas no deberían ganar fases nuevas).
 */
export async function insertSessionBlock(
  sessionId: string,
  input: {
    categoryId: string;
    name: string;
    color: string;
    plannedDurationSeconds: number;
    beforeBlockId: string | null;
  },
) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const session = await repo.getById(sessionId as SessionId, userId);
  if (!session || session.status !== "in_progress") {
    throw new Error("La sesión no está en curso.");
  }

  // Se resuelve el bloque gemelo ANTES de insertar aquí — insertar desplaza
  // posiciones, y la correspondencia por posición solo es válida mientras
  // las dos sesiones siguen alineadas (ver coop-mirror.ts).
  const coopTarget = await resolveCoopInsertTarget(
    client,
    sessionId as SessionId,
    userId,
    input.beforeBlockId as SessionBlockId | null,
  );

  const created = await repo.insertBlock(sessionId as SessionId, userId, {
    categoryId: input.categoryId as CategoryId,
    name: input.name,
    color: input.color,
    plannedDurationSeconds: input.plannedDurationSeconds,
    beforeBlockId: input.beforeBlockId as SessionBlockId | null,
  });

  if (coopTarget) {
    await mirrorInsertBlock(
      client,
      coopTarget.peer,
      sessionId as SessionId,
      userId,
      await actorUsername(client, userId),
      coopTarget.peerBeforeBlockId,
      {
        categoryId: input.categoryId as CategoryId,
        name: input.name,
        color: input.color,
        plannedDurationSeconds: input.plannedDurationSeconds,
      },
    );
  }

  return created;
}

/**
 * Reordena las fases pendientes de una sesión en marcha arrastrando (mismo
 * mecanismo que la lista de bloques de la pantalla de inicio). Rechaza
 * sesiones que ya no estén en curso, igual que insertSessionBlock.
 */
export async function reorderSessionBlocks(sessionId: string, orderedBlockIds: string[]) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const session = await repo.getById(sessionId as SessionId, userId);
  if (!session || session.status !== "in_progress") {
    throw new Error("La sesión no está en curso.");
  }

  // Mismo motivo que en insertSessionBlock: se resuelve la correspondencia
  // de bloques ANTES de reordenar aquí, mientras las posiciones de las dos
  // sesiones todavía coinciden.
  const coopTarget = await resolveCoopReorderTarget(
    client,
    sessionId as SessionId,
    userId,
    orderedBlockIds as SessionBlockId[],
  );

  await repo.reorderBlocks(sessionId as SessionId, userId, orderedBlockIds as SessionBlockId[]);

  if (coopTarget) {
    await mirrorReorderBlocks(
      client,
      coopTarget.peer,
      sessionId as SessionId,
      userId,
      await actorUsername(client, userId),
      coopTarget.peerOrderedBlockIds,
    );
  }
}

/**
 * Quita una fase todavía pendiente (deslizar en RemainingPhasesList). Mismas
 * salvaguardas que insertSessionBlock/reorderSessionBlocks: rechaza sesiones
 * que ya no estén en curso; el repositorio, a su vez, solo borra si el
 * bloque sigue en `pending` (nunca uno activo o completado).
 */
export async function removeSessionBlock(sessionId: string, blockId: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const session = await repo.getById(sessionId as SessionId, userId);
  if (!session || session.status !== "in_progress") {
    throw new Error("La sesión no está en curso.");
  }

  // Igual que insertar/reordenar: se resuelve el gemelo ANTES de borrar aquí.
  const coopTarget = await resolveCoopDeleteTarget(
    client,
    sessionId as SessionId,
    userId,
    blockId as SessionBlockId,
  );

  await repo.deleteBlock(blockId as SessionBlockId, userId);

  if (coopTarget) {
    await mirrorDeleteBlock(
      client,
      coopTarget.peer,
      sessionId as SessionId,
      userId,
      await actorUsername(client, userId),
      coopTarget.peerBlockId,
    );
  }
}
