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
    if (profile) {
      friends.push({
        friendshipId: f.id,
        ownerId: otherId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
      });
    }
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
        body: `${requesterUsername} quiere ser tu amigo en Fermança.`,
      },
    );
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }
}

/**
 * Para la pantalla pública del enlace de invitación (/community/join/[code]):
 * hace falta poder decir "X te ha invitado" antes incluso de saber si quien
 * abrió el enlace tiene cuenta. Con la clave de servicio porque el perfil
 * ajeno no es visible sin sesión — no expone nada más que el nombre.
 */
export async function getInviterByCode(code: string): Promise<{ username: string } | null> {
  const profile = await new SupabaseProfileRepository(createServiceClient()).getByInviteCode(
    code.trim().toUpperCase(),
  );
  return profile ? { username: profile.username } : null;
}

/**
 * Núcleo compartido por sendFriendRequestByCode (por código) y
 * sendFriendRequestToUser (ya conocido, p. ej. desde "amigos de un amigo"):
 * comprobar que no hay ya relación, crearla y avisar al destinatario.
 */
async function createFriendRequest(
  userId: UserId,
  client: Awaited<ReturnType<typeof createClient>>,
  targetOwnerId: UserId,
) {
  const friendshipRepo = new SupabaseFriendshipRepository(client);
  const existing = await friendshipRepo.findBetween(userId, targetOwnerId);
  if (existing) {
    throw new Error(
      existing.status === "accepted" ? "Ya sois amigos." : "Ya hay una solicitud entre vosotros.",
    );
  }

  await friendshipRepo.create(userId, targetOwnerId);

  const myProfile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (myProfile) {
    await notifyFriendRequest(targetOwnerId, myProfile.username).catch((error: unknown) => {
      // El aviso es un extra, no debe tumbar la solicitud si falla.
      console.error("No se pudo enviar el aviso de solicitud de amistad", error);
    });
  }

  revalidatePath("/community");
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

  await createFriendRequest(userId, client, targetProfile.ownerId);
}

/** Para pedir amistad a alguien cuyo ownerId ya conocemos (p. ej. desde la
 * lista de "amigos de un amigo") — sin pasar por el código de invitación. */
export async function sendFriendRequestToUser(targetOwnerId: string) {
  const { userId, client } = await requireUserId();
  if (targetOwnerId === userId) throw new Error("Ese eres tú.");
  await createFriendRequest(userId, client, targetOwnerId as UserId);
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

export interface FriendSessionBlock {
  id: string;
  name: string;
  color: string;
  actualDurationSeconds: number;
}

export interface FriendSession {
  id: string;
  startedAt: string;
  status: "completed" | "abandoned";
  blocks: FriendSessionBlock[];
}

/** Cuántas sesiones recientes se muestran en el diálogo de un amigo — junto
 * al total del mes (ver getFriendProgress), es suficiente para hacerse una
 * idea sin cargar todo el historial. */
const RECENT_SESSIONS_LIMIT = 3;

/**
 * Fases y duración real de las últimas sesiones terminadas de un amigo — a
 * diferencia de getFriendProgress, esto sí es detalle de sesiones
 * concretas, así que deliberadamente NO incluye `note` ni `finalNote`: esas
 * siguen siendo privadas incluso para amigos aceptados. Se piden de más
 * (limit 5) y se filtran las que aún están en marcha, por si el amigo tiene
 * una sesión abierta en este momento — así siempre se completan las 3.
 */
export async function getFriendRecentSessions(friendOwnerId: string): Promise<FriendSession[]> {
  const { userId, client } = await requireUserId();

  const friendship = await new SupabaseFriendshipRepository(client).findBetween(
    userId,
    friendOwnerId as UserId,
  );
  if (!friendship || friendship.status !== "accepted") throw new UnauthorizedError();

  const sessions = await new SupabaseSessionRepository(createServiceClient()).listByOwner(
    friendOwnerId as UserId,
    { limit: RECENT_SESSIONS_LIMIT + 2 },
  );

  return sessions
    .filter((s) => s.status !== "in_progress")
    .slice(0, RECENT_SESSIONS_LIMIT)
    .map((session) => ({
      id: session.id,
      startedAt: session.startedAt.toISOString(),
      status: session.status as "completed" | "abandoned",
      blocks: session.blocks.map((block) => ({
        id: block.id,
        name: block.name,
        color: block.color,
        actualDurationSeconds: block.actualDurationSeconds,
      })),
    }));
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

/** `listFriends` + `getFriendProgress` combinados — usado tanto por la
 * página de Comunidad (resumen) como por la de Amigos (lista completa), así
 * que vive aquí una sola vez en lugar de en cada page.tsx. */
export async function listFriendsWithProgress(): Promise<(Friend & FriendProgress)[]> {
  const friends = await listFriends();
  return Promise.all(
    friends.map(async (friend) => ({
      ...friend,
      ...(await getFriendProgress(friend.ownerId)),
    })),
  );
}

export interface FriendOfFriend {
  ownerId: string;
  username: string;
  /** Relación entre QUIEN PIDE los datos (no el amigo mostrado) y esta
   * persona — para saber si mostrar "Añadir", "Pendiente" o nada. */
  relationship: "accepted" | "pending" | "none";
}

/**
 * Amigos de un amigo tuyo — solo si ya sois amigos aceptados. La lista de
 * amistades de esa otra persona no es visible por RLS (cada uno ve solo las
 * suyas), así que se lee con la clave de servicio; el perfil (nombre) de
 * cada tercero, igual. Te excluyes a ti mismo del resultado (siempre
 * apareces en la lista de amigos de tu propio amigo, no aporta nada
 * mostrártelo).
 */
export async function getFriendsOfFriend(friendOwnerId: string): Promise<FriendOfFriend[]> {
  const { userId, client } = await requireUserId();

  const friendship = await new SupabaseFriendshipRepository(client).findBetween(
    userId,
    friendOwnerId as UserId,
  );
  if (!friendship || friendship.status !== "accepted") throw new UnauthorizedError();

  const serviceClient = createServiceClient();
  const theirFriendships = await new SupabaseFriendshipRepository(serviceClient).listByOwner(
    friendOwnerId as UserId,
  );
  const accepted = theirFriendships.filter((f) => f.status === "accepted");

  const profileRepo = new SupabaseProfileRepository(serviceClient);
  const viewerFriendshipRepo = new SupabaseFriendshipRepository(client);

  const results: FriendOfFriend[] = [];
  for (const f of accepted) {
    const otherId = f.requesterId === friendOwnerId ? f.addresseeId : f.requesterId;
    if (otherId === userId) continue;

    const profile = await profileRepo.getByOwnerId(otherId);
    if (!profile) continue;

    const existing = await viewerFriendshipRepo.findBetween(userId, otherId);
    results.push({
      ownerId: otherId,
      username: profile.username,
      relationship: existing ? (existing.status === "accepted" ? "accepted" : "pending") : "none",
    });
  }
  return results;
}

export interface SuggestedFriend {
  ownerId: string;
  username: string;
  avatarUrl: string | null;
  /** Cuántos de tus amigos ya son amigos de esta persona — el único criterio
   * de orden hoy (no hay ninguna señal de "activo recientemente" guardada). */
  mutualCount: number;
}

const MAX_SUGGESTED_FRIENDS = 10;

/**
 * "Amigos de tus amigos" agregado sobre TODOS tus amigos aceptados, no uno
 * en concreto (a diferencia de getFriendsOfFriend, que es por amigo y
 * alimenta el diálogo de un amigo individual) — para el apartado de
 * sugerencias de Comunidad, así no hace falta compartir un código/enlace
 * para encontrar gente con quien ya tienes amigos en común. Mismo patrón de
 * las demás consultas "entre usuarios": tu propia lista de amistades decide
 * quién excluir (ya amigo, o solicitud pendiente en cualquier sentido) con
 * tu cliente normal; la travesía de las amistades de cada amigo tuyo (que
 * RLS no te deja ver directamente) va con la clave de servicio, y el
 * resultado nunca expone más que username/avatar/el recuento.
 */
export async function listSuggestedFriends(): Promise<SuggestedFriend[]> {
  const { userId, client } = await requireUserId();

  const myFriendships = await new SupabaseFriendshipRepository(client).listByOwner(userId);
  const myAcceptedFriendIds = myFriendships
    .filter((f) => f.status === "accepted")
    .map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
  if (myAcceptedFriendIds.length === 0) return [];

  // Cualquiera con quien ya tengas una fila en friendships (aceptada o
  // pendiente, en cualquier sentido) no debe sugerirse — ya sois amigos, o
  // ya hay una solicitud en curso entre vosotros.
  const excludedIds = new Set(
    myFriendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)),
  );

  const serviceClient = createServiceClient();
  const friendshipRepo = new SupabaseFriendshipRepository(serviceClient);

  const mutualCounts = new Map<UserId, number>();
  for (const friendId of myAcceptedFriendIds) {
    const theirFriendships = await friendshipRepo.listByOwner(friendId);
    for (const f of theirFriendships) {
      if (f.status !== "accepted") continue;
      const otherId = f.requesterId === friendId ? f.addresseeId : f.requesterId;
      if (otherId === userId || excludedIds.has(otherId)) continue;
      mutualCounts.set(otherId, (mutualCounts.get(otherId) ?? 0) + 1);
    }
  }

  const topCandidateIds = [...mutualCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SUGGESTED_FRIENDS);
  if (topCandidateIds.length === 0) return [];

  const profileRepo = new SupabaseProfileRepository(serviceClient);
  const results: SuggestedFriend[] = [];
  for (const [ownerId, mutualCount] of topCandidateIds) {
    const profile = await profileRepo.getByOwnerId(ownerId);
    if (!profile) continue;
    results.push({ ownerId, username: profile.username, avatarUrl: profile.avatarUrl, mutualCount });
  }
  return results;
}
