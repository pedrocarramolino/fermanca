"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseSessionShareRepository } from "@/core/infrastructure/supabase/repositories/session-share-repository";
import { SupabaseSessionShareReactionRepository } from "@/core/infrastructure/supabase/repositories/session-share-reaction-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import { hasPracticedTime } from "@/core/domain/session";
import { isReactionEmoji, REACTION_EMOJIS, type ReactionSummary } from "@/core/domain/reaction";
import type { SessionShare } from "@/core/domain/session-share";
import type { SessionShareReactionRow } from "@/core/domain/repositories/session-share-reaction-repository";
import type { SessionBlockId, SessionId, SessionShareId, UserId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

const FEED_LIMIT = 30;

/** Solo los emojis con al menos una reacción, contados y marcados según si
 * el que mira el feed es uno de quienes reaccionó así. */
function summarizeReactions(
  rows: SessionShareReactionRow[],
  shareId: SessionShareId,
  viewerId: UserId,
): ReactionSummary[] {
  const forShare = rows.filter((r) => r.sessionShareId === shareId);
  return REACTION_EMOJIS.map((emoji) => {
    const matches = forShare.filter((r) => r.emoji === emoji);
    return { emoji, count: matches.length, reactedByMe: matches.some((r) => r.ownerId === viewerId) };
  }).filter((r) => r.count > 0);
}

export async function listFeed(): Promise<SessionShare[]> {
  const { userId, client } = await requireUserId();
  const shares = await new SupabaseSessionShareRepository(client).listFeed(userId, FEED_LIMIT);
  const reactionRows = await new SupabaseSessionShareReactionRepository(client).listForShares(
    shares.map((s) => s.id),
  );
  return shares.map((share) => ({
    ...share,
    reactions: summarizeReactions(reactionRows, share.id, userId),
  }));
}

export async function toggleReaction(sessionShareId: string, emoji: string): Promise<void> {
  const { userId, client } = await requireUserId();
  if (!isReactionEmoji(emoji)) throw new Error("Emoji no válido.");
  await new SupabaseSessionShareReactionRepository(client).toggle(
    sessionShareId as SessionShareId,
    userId,
    emoji,
  );
  revalidatePath("/");
}

/** Para que el botón de "Compartir en el Feed" del resumen de sesión sepa
 * si esta sesión ya está compartida (y ofrezca quitarla en vez de volver a
 * publicarla). */
export async function getMySessionShare(sessionId: string): Promise<SessionShare | null> {
  const { userId, client } = await requireUserId();
  return new SupabaseSessionShareRepository(client).findBySessionId(sessionId as SessionId, userId);
}

const MAX_TITLE_LENGTH = 100;

export async function shareSessionToFeed(
  sessionId: string,
  blocks: { id: string; name: string; color: string; actualDurationSeconds: number }[],
  title: string | null,
): Promise<SessionShare> {
  const { userId, client } = await requireUserId();

  const trimmedTitle = title?.trim() || null;
  if (trimmedTitle && trimmedTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`El título no puede tener más de ${MAX_TITLE_LENGTH} caracteres.`);
  }

  const [session, profile] = await Promise.all([
    new SupabaseSessionRepository(client).getById(sessionId as SessionId, userId),
    new SupabaseProfileRepository(client).getByOwnerId(userId),
  ]);
  if (!session) throw new Error("Sesión no encontrada.");
  if (!profile) throw new Error("Perfil no encontrado.");

  const practicedBlocks = blocks.filter(hasPracticedTime);
  const totalDurationSeconds = practicedBlocks.reduce(
    (total, block) => total + block.actualDurationSeconds,
    0,
  );

  const share = await new SupabaseSessionShareRepository(client).create({
    sessionId: session.id,
    ownerId: userId,
    ownerUsername: profile.username,
    ownerAvatarUrl: profile.avatarUrl,
    title: trimmedTitle,
    startedAt: session.startedAt,
    totalDurationSeconds,
    blocks: practicedBlocks.map((block) => ({ ...block, id: block.id as SessionBlockId })),
  });

  revalidatePath("/");
  return share;
}

export async function unshareFromFeed(sessionShareId: string): Promise<void> {
  const { userId, client } = await requireUserId();
  await new SupabaseSessionShareRepository(client).remove(sessionShareId as SessionShareId, userId);
  revalidatePath("/");
}
