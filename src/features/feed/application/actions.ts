"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseSessionShareRepository } from "@/core/infrastructure/supabase/repositories/session-share-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { SessionShare } from "@/core/domain/session-share";
import type { SessionBlockId, SessionId, SessionShareId, UserId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

const FEED_LIMIT = 30;

export async function listFeed(): Promise<SessionShare[]> {
  const { userId, client } = await requireUserId();
  return new SupabaseSessionShareRepository(client).listFeed(userId, FEED_LIMIT);
}

/** Para que el botón de "Compartir en el Feed" del resumen de sesión sepa
 * si esta sesión ya está compartida (y ofrezca quitarla en vez de volver a
 * publicarla). */
export async function getMySessionShare(sessionId: string): Promise<SessionShare | null> {
  const { userId, client } = await requireUserId();
  return new SupabaseSessionShareRepository(client).findBySessionId(sessionId as SessionId, userId);
}

export async function shareSessionToFeed(
  sessionId: string,
  blocks: { id: string; name: string; color: string; actualDurationSeconds: number }[],
): Promise<SessionShare> {
  const { userId, client } = await requireUserId();

  const [session, profile] = await Promise.all([
    new SupabaseSessionRepository(client).getById(sessionId as SessionId, userId),
    new SupabaseProfileRepository(client).getByOwnerId(userId),
  ]);
  if (!session) throw new Error("Sesión no encontrada.");
  if (!profile) throw new Error("Perfil no encontrado.");

  const totalDurationSeconds = blocks.reduce((total, block) => total + block.actualDurationSeconds, 0);

  const share = await new SupabaseSessionShareRepository(client).create({
    sessionId: session.id,
    ownerId: userId,
    ownerUsername: profile.username,
    ownerAvatarUrl: profile.avatarUrl,
    startedAt: session.startedAt,
    totalDurationSeconds,
    blocks: blocks.map((block) => ({ ...block, id: block.id as SessionBlockId })),
  });

  revalidatePath("/");
  return share;
}

export async function unshareFromFeed(sessionShareId: string): Promise<void> {
  const { userId, client } = await requireUserId();
  await new SupabaseSessionShareRepository(client).remove(sessionShareId as SessionShareId, userId);
  revalidatePath("/");
}
