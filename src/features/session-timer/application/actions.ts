"use server";

import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { SessionBlockId, SessionId, UserId } from "@/core/domain/ids";

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
  now: string;
}) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);

  for (const block of input.completedBlocks) {
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
    plannedDurationSeconds: block.plannedDurationSeconds,
    actualDurationSeconds: block.actualDurationSeconds,
    note: block.note,
  }));
}

/** El cliente lo llama justo al mostrar su propio aviso local (app en
 * segundo plano pero con JS aún corriendo), para que el cron de push
 * (/api/cron/session-phases) no lo duplique unos segundos después. */
export async function markPhaseAlertSent(blockId: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);
  await repo.markPhaseAlertSent(blockId as SessionBlockId, userId);
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
