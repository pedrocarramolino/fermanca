"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseSessionShareRepository } from "@/core/infrastructure/supabase/repositories/session-share-repository";
import { SupabaseSessionShareReactionRepository } from "@/core/infrastructure/supabase/repositories/session-share-reaction-repository";
import { SupabaseWeeklyGoalShareRepository } from "@/core/infrastructure/supabase/repositories/weekly-goal-share-repository";
import { SupabaseWeeklyGoalShareReactionRepository } from "@/core/infrastructure/supabase/repositories/weekly-goal-share-reaction-repository";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { UnauthorizedError } from "@/core/domain/errors";
import { hasPracticedTime } from "@/core/domain/session";
import { isReactionEmoji, REACTION_EMOJIS, type ReactionSummary } from "@/core/domain/reaction";
import type { SessionShare } from "@/core/domain/session-share";
import type { WeeklyGoalShare } from "@/core/domain/weekly-goal-share";
import type {
  SessionBlockId,
  SessionId,
  SessionShareId,
  UserId,
  WeeklyGoalShareId,
} from "@/core/domain/ids";

/** Une los dos tipos de publicación del Feed (sesión compartida, objetivo
 * semanal cumplido) en una sola línea de tiempo — FeedList/FeedItem
 * distinguen cuál es cuál por `kind` en vez de necesitar dos listas y dos
 * mecanismos de scroll aparte. */
export type FeedEntry =
  | { kind: "session"; share: SessionShare }
  | { kind: "weekly-goal"; share: WeeklyGoalShare };

/** Las reacciones de sesiones y de objetivos viven en tablas separadas
 * (session_share_reactions / weekly_goal_share_reactions) — `kind` decide
 * cuál usar en toggleReaction sin exponer dos acciones distintas al cliente. */
export type ShareKind = "session" | "weekly-goal";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

const FEED_LIMIT = 30;

/** Solo los emojis con al menos una reacción. `reactedByUsernames` solo se
 * calcula para quien publicó (usernameByOwnerId ya viene vacío para el
 * resto) — el resto de gente ve el recuento, no quién es cada uno. */
function summarizeReactions(
  matchingRows: { ownerId: UserId; emoji: string }[],
  viewerId: UserId,
  isOwner: boolean,
  usernameByOwnerId: Map<UserId, string>,
): ReactionSummary[] {
  return REACTION_EMOJIS.map((emoji) => {
    const matches = matchingRows.filter((r) => r.emoji === emoji);
    return {
      emoji,
      count: matches.length,
      reactedByMe: matches.some((r) => r.ownerId === viewerId),
      reactedByUsernames: isOwner
        ? matches.map((r) => usernameByOwnerId.get(r.ownerId)).filter((u): u is string => !!u)
        : undefined,
    };
  }).filter((r) => r.count > 0);
}

/** Nombres de quienes han reaccionado a TUS publicaciones — se piden de
 * golpe para todos los reactores relevantes en vez de uno a uno. La RLS de
 * profiles ya permite verlos: cualquiera que haya podido reaccionar es o tú
 * mismo, o un amigo aceptado (RLS de *_share_reactions_insert_own así lo exige). */
async function fetchUsernames(
  client: Awaited<ReturnType<typeof createClient>>,
  ownerIds: UserId[],
): Promise<Map<UserId, string>> {
  if (ownerIds.length === 0) return new Map();
  const { data, error } = await client
    .from("profiles")
    .select("owner_id, username")
    .in("owner_id", ownerIds);
  if (error) throw error;
  return new Map(data.map((p) => [p.owner_id as UserId, p.username]));
}

export async function listFeed(): Promise<FeedEntry[]> {
  const { userId, client } = await requireUserId();
  const [shares, goalShares] = await Promise.all([
    new SupabaseSessionShareRepository(client).listFeed(userId, FEED_LIMIT),
    new SupabaseWeeklyGoalShareRepository(client).listFeed(userId, FEED_LIMIT),
  ]);
  const [sessionReactionRows, goalReactionRows] = await Promise.all([
    new SupabaseSessionShareReactionRepository(client).listForShares(shares.map((s) => s.id)),
    new SupabaseWeeklyGoalShareReactionRepository(client).listForShares(goalShares.map((s) => s.id)),
  ]);

  // Solo hace falta el nombre de quien reaccionó en TUS publicaciones — para
  // las de un amigo, ver el recuento ya es suficiente.
  const reactorIdsNeedingNames = new Set<UserId>();
  for (const share of shares) {
    if (share.ownerId !== userId) continue;
    for (const row of sessionReactionRows) if (row.sessionShareId === share.id) reactorIdsNeedingNames.add(row.ownerId);
  }
  for (const share of goalShares) {
    if (share.ownerId !== userId) continue;
    for (const row of goalReactionRows) if (row.weeklyGoalShareId === share.id) reactorIdsNeedingNames.add(row.ownerId);
  }
  const usernameByOwnerId = await fetchUsernames(client, [...reactorIdsNeedingNames]);

  const entries: FeedEntry[] = [
    ...shares.map((share): FeedEntry => {
      const isOwner = share.ownerId === userId;
      return {
        kind: "session",
        share: {
          ...share,
          reactions: summarizeReactions(
            sessionReactionRows.filter((r) => r.sessionShareId === share.id),
            userId,
            isOwner,
            usernameByOwnerId,
          ),
        },
      };
    }),
    ...goalShares.map((share): FeedEntry => {
      const isOwner = share.ownerId === userId;
      return {
        kind: "weekly-goal",
        share: {
          ...share,
          reactions: summarizeReactions(
            goalReactionRows.filter((r) => r.weeklyGoalShareId === share.id),
            userId,
            isOwner,
            usernameByOwnerId,
          ),
        },
      };
    }),
  ];

  // Las dos consultas ya vienen ordenadas por su cuenta (más reciente
  // primero) — al mezclarlas hay que reordenar la unión entera, y recortar
  // otra vez al límite del feed (juntas podrían sumar más de FEED_LIMIT).
  return entries
    .sort((a, b) => b.share.createdAt.getTime() - a.share.createdAt.getTime())
    .slice(0, FEED_LIMIT);
}

/** El dueño de la publicación no tiene ninguna sesión abierta en este
 * request — sus suscripciones solo se pueden leer con la clave de
 * servicio, mismo patrón que el aviso de solicitud de amistad. */
async function notifySessionReaction(
  share: SessionShare,
  reactorId: UserId,
  emoji: string,
  client: Awaited<ReturnType<typeof createClient>>,
) {
  if (share.ownerId === reactorId) return; // reaccionar a tu propia publicación no avisa a nadie

  const reactor = await new SupabaseProfileRepository(client).getByOwnerId(reactorId);
  const serviceClient = createServiceClient();
  const { data: subscriptions, error } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", share.ownerId);
  if (error) throw error;

  const reactorUsername = reactor?.username ?? "Alguien";
  const pushRepo = new SupabasePushSubscriptionRepository(serviceClient);
  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "session-share-reaction",
        title: "Nueva reacción",
        body: `${reactorUsername} ha reaccionado con ${emoji} a tu sesión compartida.`,
        sessionShareId: share.id,
      },
    );
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }
}

/** Mismo patrón que notifySessionReaction, para un objetivo semanal
 * compartido en vez de una sesión. */
async function notifyGoalReaction(
  share: WeeklyGoalShare,
  reactorId: UserId,
  emoji: string,
  client: Awaited<ReturnType<typeof createClient>>,
) {
  if (share.ownerId === reactorId) return;

  const reactor = await new SupabaseProfileRepository(client).getByOwnerId(reactorId);
  const serviceClient = createServiceClient();
  const { data: subscriptions, error } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", share.ownerId);
  if (error) throw error;

  const reactorUsername = reactor?.username ?? "Alguien";
  const pushRepo = new SupabasePushSubscriptionRepository(serviceClient);
  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "weekly-goal-share-reaction",
        title: "Nueva reacción",
        body: `${reactorUsername} ha reaccionado con ${emoji} a tu objetivo semanal cumplido.`,
        weeklyGoalShareId: share.id,
      },
    );
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }
}

export async function toggleReaction(kind: ShareKind, shareId: string, emoji: string): Promise<void> {
  const { userId, client } = await requireUserId();
  if (!isReactionEmoji(emoji)) throw new Error("Emoji no válido.");

  if (kind === "session") {
    const repo = new SupabaseSessionShareReactionRepository(client);
    const reacted = await repo.toggle(shareId as SessionShareId, userId, emoji);
    if (reacted) {
      const share = await new SupabaseSessionShareRepository(client).getById(shareId as SessionShareId);
      if (share) {
        await notifySessionReaction(share, userId, emoji, client).catch((error: unknown) => {
          // El aviso es un extra, no debe tumbar la reacción si falla.
          console.error("No se pudo enviar el aviso de reacción", error);
        });
      }
    }
  } else {
    const repo = new SupabaseWeeklyGoalShareReactionRepository(client);
    const reacted = await repo.toggle(shareId as WeeklyGoalShareId, userId, emoji);
    if (reacted) {
      const share = await new SupabaseWeeklyGoalShareRepository(client).getById(
        shareId as WeeklyGoalShareId,
      );
      if (share) {
        await notifyGoalReaction(share, userId, emoji, client).catch((error: unknown) => {
          // El aviso es un extra, no debe tumbar la reacción si falla.
          console.error("No se pudo enviar el aviso de reacción", error);
        });
      }
    }
  }

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

/** Para que el botón de compartir del objetivo semanal sepa si el de esta
 * semana ya está compartido (y ofrezca quitarlo en vez de compartirlo otra
 * vez) — mismo patrón que getMySessionShare. */
export async function getMyWeeklyGoalShare(weekStart: string): Promise<WeeklyGoalShare | null> {
  const { userId, client } = await requireUserId();
  return new SupabaseWeeklyGoalShareRepository(client).findByWeek(userId, weekStart);
}

export async function shareWeeklyGoalToFeed(input: {
  weekStart: string;
  targetDays: number;
  targetSeconds: number;
  practicedDays: number;
  practicedSeconds: number;
  streakDays: number;
}): Promise<WeeklyGoalShare> {
  const { userId, client } = await requireUserId();

  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (!profile) throw new Error("Perfil no encontrado.");

  const share = await new SupabaseWeeklyGoalShareRepository(client).create({
    ownerId: userId,
    ownerUsername: profile.username,
    ownerAvatarUrl: profile.avatarUrl,
    weekStart: input.weekStart,
    targetDays: input.targetDays,
    targetSeconds: input.targetSeconds,
    practicedDays: input.practicedDays,
    practicedSeconds: input.practicedSeconds,
    streakDays: input.streakDays,
  });

  revalidatePath("/");
  return share;
}

export async function unshareWeeklyGoalFromFeed(weeklyGoalShareId: string): Promise<void> {
  const { userId, client } = await requireUserId();
  await new SupabaseWeeklyGoalShareRepository(client).remove(
    weeklyGoalShareId as WeeklyGoalShareId,
    userId,
  );
  revalidatePath("/");
}
