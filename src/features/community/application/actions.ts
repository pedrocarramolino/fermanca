"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabaseFriendshipRepository } from "@/core/infrastructure/supabase/repositories/friendship-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { UnauthorizedError } from "@/core/domain/errors";
import { currentStreakDays, practiceSecondsByDay } from "@/core/domain/streaks";
import { monthlySeries, weeklySeries } from "@/core/domain/session-statistics";
import type { Friend } from "@/core/domain/friendship";
import type { FriendshipId, UserId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

export async function getMyProfile() {
  const { userId, client } = await requireUserId();
  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (!profile) throw new Error("Perfil no encontrado.");
  return profile;
}

export interface PendingRequest {
  friendshipId: string;
  fromUsername: string;
}

export async function listPendingRequests(): Promise<PendingRequest[]> {
  const { userId, client } = await requireUserId();
  const friendships = await new SupabaseFriendshipRepository(client).listByOwner(userId);
  const incoming = friendships.filter((f) => f.status === "pending" && f.addresseeId === userId);
  if (incoming.length === 0) return [];

  const profileRepo = new SupabaseProfileRepository(client);
  const results: PendingRequest[] = [];
  for (const f of incoming) {
    const profile = await profileRepo.getByOwnerId(f.requesterId);
    results.push({ friendshipId: f.id, fromUsername: profile?.username ?? "Usuario" });
  }
  return results;
}

export async function listFriends(): Promise<Friend[]> {
  const { userId, client } = await requireUserId();
  const friendships = await new SupabaseFriendshipRepository(client).listByOwner(userId);
  const accepted = friendships.filter((f) => f.status === "accepted");

  const profileRepo = new SupabaseProfileRepository(client);
  const friends: Friend[] = [];
  for (const f of accepted) {
    const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
    const profile = await profileRepo.getByOwnerId(otherId);
    if (profile) friends.push({ friendshipId: f.id, ownerId: otherId, username: profile.username });
  }
  return friends;
}

/** El que recibe la solicitud no tiene ninguna sesión abierta en este
 * request — sus suscripciones solo se pueden leer con la clave de
 * servicio, igual que en los avisos de recordatorio/fin de fase. */
async function notifyFriendRequest(addresseeId: UserId, requesterUsername: string) {
  const serviceClient = createServiceClient();
  const { data: subscriptions, error } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", addresseeId);
  if (error) throw error;

  const pushRepo = new SupabasePushSubscriptionRepository(serviceClient);
  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "friend-request",
        title: "Nueva solicitud de amistad",
        body: `${requesterUsername} quiere ser tu amigo en PracticeFlow.`,
      },
    );
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }
}

export async function sendFriendRequestByCode(inviteCode: string) {
  const { userId, client } = await requireUserId();
  const code = inviteCode.trim().toUpperCase();
  if (!code) throw new Error("Introduce un código de invitación.");

  // Buscar por código necesita ver perfiles ajenos antes de que exista
  // amistad — RLS lo bloquea a propósito con la clave pública (para que no
  // se puedan recorrer perfiles), así que esta búsqueda va con la clave de
  // servicio.
  const targetProfile = await new SupabaseProfileRepository(createServiceClient()).getByInviteCode(
    code,
  );
  if (!targetProfile) throw new Error("Código de invitación no válido.");
  if (targetProfile.ownerId === userId) throw new Error("Ese código de invitación es el tuyo.");

  const friendshipRepo = new SupabaseFriendshipRepository(client);
  const existing = await friendshipRepo.findBetween(userId, targetProfile.ownerId);
  if (existing) {
    throw new Error(
      existing.status === "accepted" ? "Ya sois amigos." : "Ya hay una solicitud entre vosotros.",
    );
  }

  await friendshipRepo.create(userId, targetProfile.ownerId);

  const myProfile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (myProfile) {
    await notifyFriendRequest(targetProfile.ownerId, myProfile.username).catch((error: unknown) => {
      // El aviso es un extra, no debe tumbar la solicitud si falla.
      console.error("No se pudo enviar el aviso de solicitud de amistad", error);
    });
  }

  revalidatePath("/community");
}

export async function acceptFriendRequest(friendshipId: string) {
  const { userId, client } = await requireUserId();
  await new SupabaseFriendshipRepository(client).accept(friendshipId as FriendshipId, userId);
  revalidatePath("/community");
}

/** Mismo gesto para rechazar una pendiente o dejar de ser amigos — solo
 * cambia si el usuario la había pedido o no. */
export async function removeFriendship(friendshipId: string) {
  const { userId, client } = await requireUserId();
  await new SupabaseFriendshipRepository(client).remove(friendshipId as FriendshipId, userId);
  revalidatePath("/community");
}

export interface FriendLastSessionBlock {
  id: string;
  name: string;
  color: string;
  actualDurationSeconds: number;
}

export interface FriendLastSession {
  startedAt: string;
  status: "completed" | "abandoned";
  blocks: FriendLastSessionBlock[];
}

/**
 * Fases y duración real de la última sesión terminada de un amigo — a
 * diferencia de getFriendProgress, esto sí es detalle de una sesión
 * concreta, así que deliberadamente NO incluye `note` ni `finalNote`: esas
 * siguen siendo privadas incluso para amigos aceptados.
 */
export async function getFriendLastSession(
  friendOwnerId: string,
): Promise<FriendLastSession | null> {
  const { userId, client } = await requireUserId();

  const friendship = await new SupabaseFriendshipRepository(client).findBetween(
    userId,
    friendOwnerId as UserId,
  );
  if (!friendship || friendship.status !== "accepted") throw new UnauthorizedError();

  const sessions = await new SupabaseSessionRepository(createServiceClient()).listByOwner(
    friendOwnerId as UserId,
    { limit: 5 },
  );
  const last = sessions.find((s) => s.status !== "in_progress");
  if (!last) return null;

  return {
    startedAt: last.startedAt.toISOString(),
    status: last.status as "completed" | "abandoned",
    blocks: last.blocks.map((block) => ({
      id: block.id,
      name: block.name,
      color: block.color,
      actualDurationSeconds: block.actualDurationSeconds,
    })),
  };
}

export interface FriendProgress {
  weeklySeconds: number;
  monthlySeconds: number;
  currentStreak: number;
}

/**
 * Solo agregados, nunca las sesiones en sí. Comprueba primero que hay
 * amistad aceptada, y solo entonces calcula los números con la clave de
 * servicio — RLS no deja ver las sesiones de otro usuario ni siendo
 * amigos, a propósito: el detalle de una sesión (bloques, notas) sigue
 * siendo privado incluso para quien puede ver estos totales.
 */
export async function getFriendProgress(friendOwnerId: string): Promise<FriendProgress> {
  const { userId, client } = await requireUserId();

  const friendship = await new SupabaseFriendshipRepository(client).findBetween(
    userId,
    friendOwnerId as UserId,
  );
  if (!friendship || friendship.status !== "accepted") throw new UnauthorizedError();

  const sessions = await new SupabaseSessionRepository(createServiceClient()).listByOwner(
    friendOwnerId as UserId,
    { limit: 1000 },
  );

  const now = new Date();
  const byDay = practiceSecondsByDay(sessions);
  return {
    weeklySeconds: weeklySeries(sessions, 1, now)[0]!.seconds,
    monthlySeconds: monthlySeries(sessions, 1, now)[0]!.seconds,
    currentStreak: currentStreakDays(byDay, now),
  };
}
