"use server";

import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { SessionBlockId, SessionId, UserId } from "@/core/domain/ids";
import {
  cancelQstashMessage,
  scheduleSessionPhaseAlert,
} from "@/core/infrastructure/qstash/client";

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
  completedBlocks: { id: string; actualDurationSeconds: number }[];
  nextBlockId: string | null;
  nextBlockPlannedDurationSeconds?: number;
  now: string;
}) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  for (const block of input.completedBlocks) {
    // Se confirmó a mano antes de que llegara el aviso programado — se
    // cancela para que no llegue después un push de una fase que ya se
    // cerró.
    const pendingMessageId = await repo.getBlockQstashMessageId(block.id as SessionBlockId);
    if (pendingMessageId) await cancelQstashMessage(pendingMessageId);

    await repo.updateBlock(block.id as SessionBlockId, userId, {
      status: "completed",
      endedAt: new Date(input.now),
      actualDurationSeconds: block.actualDurationSeconds,
    });
  }
  if (input.nextBlockId) {
    await repo.updateBlock(input.nextBlockId as SessionBlockId, userId, {
      status: "active",
      startedAt: new Date(input.now),
    });
    if (input.nextBlockPlannedDurationSeconds != null) {
      const messageId = await scheduleSessionPhaseAlert(
        input.nextBlockId,
        input.nextBlockPlannedDurationSeconds,
      );
      await repo.setBlockQstashMessageId(input.nextBlockId as SessionBlockId, messageId);
    }
  }
}

/**
 * El usuario pide más tiempo para la fase que acaba de terminar en vez de
 * pasar a la siguiente — cancela el aviso QStash ya vencido (si sigue sin
 * entregarse) y programa uno nuevo para el plazo ampliado, para que el
 * aviso de fin de fase siga llegando aunque el móvil esté bloqueado.
 */
export async function extendActiveBlock(blockId: string, extraSeconds: number) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const pendingMessageId = await repo.getBlockQstashMessageId(blockId as SessionBlockId);
  if (pendingMessageId) await cancelQstashMessage(pendingMessageId);

  const messageId = await scheduleSessionPhaseAlert(blockId, extraSeconds);
  await repo.extendBlock(blockId as SessionBlockId, userId, extraSeconds, messageId);
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
    plannedDurationSeconds: block.plannedDurationSeconds,
    actualDurationSeconds: block.actualDurationSeconds,
    note: block.note,
  }));
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
