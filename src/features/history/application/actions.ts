"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { SessionId, UserId } from "@/core/domain/ids";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";

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
