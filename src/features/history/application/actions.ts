"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { SessionId, UserId } from "@/core/domain/ids";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";
import {
  toNewSessionBlocks,
  type DraftBlockInput,
} from "@/features/session-builder/application/draft-block";

export async function loadMoreSessions(offset: number) {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const repo = new SupabaseSessionRepository(client);
  return repo.listByOwner(userId as UserId, { limit: HISTORY_PAGE_SIZE, offset });
}

/** Borra una sesión que no interesa conservar en el historial — nunca una
 * en curso, que se maneja desde su propia pantalla (pausar/abandonar), no
 * borrándola a mitad. */
export async function deleteSession(sessionId: string) {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const repo = new SupabaseSessionRepository(client);
  const session = await repo.getById(sessionId as SessionId, userId as UserId);
  if (!session) throw new Error("Sesión no encontrada.");
  if (session.status === "in_progress") {
    throw new Error("No se puede eliminar una sesión en curso.");
  }

  await repo.remove(sessionId as SessionId, userId as UserId);
  revalidatePath("/history");
  revalidatePath("/statistics");
  revalidatePath("/");
}

/** Registra a mano una sesión ya practicada (fuera de la app, o que se
 * olvidó cronometrar) — queda en el historial como 'completed' igual que
 * una sesión normal, contando para estadísticas, rachas y el objetivo
 * semanal. `startedAt` llega ya resuelto a ISO absoluto desde el cliente
 * (ahí se conoce la zona horaria real del usuario). */
export async function logManualSession(startedAt: string, blocks: DraftBlockInput[]) {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  if (blocks.length === 0) throw new Error("Añade al menos una fase.");
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) throw new Error("Fecha no válida.");
  if (start.getTime() > Date.now()) throw new Error("La fecha no puede ser futura.");

  const repo = new SupabaseSessionRepository(client);
  const session = await repo.logManual({
    ownerId: userId as UserId,
    startedAt: start,
    blocks: toNewSessionBlocks(blocks),
  });

  revalidatePath("/history");
  revalidatePath("/statistics");
  revalidatePath("/");
  return session;
}
