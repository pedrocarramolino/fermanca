"use server";

import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import { currentStreakDays, practiceSecondsByDay } from "@/core/domain/streaks";
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
 * El usuario pausa el bloque activo — se cancela el aviso QStash pendiente
 * para que no llegue un "fin de fase" mientras el cronómetro está parado, y
 * se guarda cuánto quedaba en ese instante: sin esto, recargar la página o
 * volver más tarde recalcularía el tiempo restante desde `started_at` como
 * si hubiera seguido corriendo mientras se estaba fuera. Se libera al
 * reanudar (ver resumeActiveBlock).
 */
export async function pauseActiveBlock(blockId: string, remainingSeconds: number) {
  const { client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  const pendingMessageId = await repo.getBlockQstashMessageId(blockId as SessionBlockId);
  if (pendingMessageId) await cancelQstashMessage(pendingMessageId);
  await repo.setBlockQstashMessageId(blockId as SessionBlockId, null);
  await repo.setBlockPausedRemainingSeconds(blockId as SessionBlockId, Math.round(remainingSeconds));
}

/**
 * Reanuda un bloque pausado: `newStartedAt` ya viene desplazado por el
 * tiempo que ha estado en pausa (ver useSessionRuntime), así que persistirlo
 * mantiene el cálculo de elapsed/remaining correcto tras un refresco. El
 * aviso de fin de fase se reprograma para lo que quedaba, no para la
 * duración completa de la fase, y se libera la marca de pausa.
 */
export async function resumeActiveBlock(
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
    pausedRemainingSeconds: block.pausedRemainingSeconds,
  }));
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
