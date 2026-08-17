"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseSessionInviteRepository } from "@/core/infrastructure/supabase/repositories/session-invite-repository";
import { SupabaseFriendshipRepository } from "@/core/infrastructure/supabase/repositories/friendship-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import {
  toNewSessionBlocks,
  type DraftBlockInput,
} from "@/features/session-builder/application/draft-block";
import { UnauthorizedError } from "@/core/domain/errors";
import type { InviteDraftBlock } from "@/core/domain/session-invite";
import type { SessionId, SessionInviteId, TemplateId, UserId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

async function notifyPushToUser(
  targetOwnerId: UserId,
  payload: Parameters<typeof sendPush>[1],
) {
  const serviceClient = createServiceClient();
  const { data: subscriptions, error } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", targetOwnerId);
  if (error) throw error;

  const pushRepo = new SupabasePushSubscriptionRepository(serviceClient);
  for (const sub of subscriptions) {
    const result = await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }
}

export async function createSessionInvite(
  templateId: string | null,
  blocks: DraftBlockInput[],
  friendOwnerId: string,
) {
  const { userId, client } = await requireUserId();
  if (friendOwnerId === userId) throw new Error("No puedes invitarte a ti mismo.");

  // Defensa en profundidad — la RLS de session_invites ya lo exige.
  const friendship = await new SupabaseFriendshipRepository(client).findBetween(
    userId,
    friendOwnerId as UserId,
  );
  if (!friendship || friendship.status !== "accepted") {
    throw new Error("Solo puedes invitar a un amigo.");
  }

  const invite = await new SupabaseSessionInviteRepository(client).create({
    inviterId: userId,
    inviteeId: friendOwnerId as UserId,
    templateId: templateId as TemplateId | null,
    blocks: blocks as InviteDraftBlock[],
  });

  const myProfile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (myProfile) {
    await notifyPushToUser(friendOwnerId as UserId, {
      kind: "session-invite",
      title: "Invitación a practicar juntos",
      body: `${myProfile.username} te invita a hacer una sesión de práctica juntos en Fermança.`,
      inviteId: invite.id,
    }).catch((error: unknown) => {
      console.error("No se pudo avisar de la invitación a sesión", error);
    });
  }

  revalidatePath("/community");
  return invite;
}

export async function cancelSessionInvite(inviteId: string) {
  const { userId, client } = await requireUserId();
  await new SupabaseSessionInviteRepository(client).cancel(inviteId as SessionInviteId, userId);
  revalidatePath("/community");
}

export async function declineSessionInvite(inviteId: string) {
  const { userId, client } = await requireUserId();
  await new SupabaseSessionInviteRepository(client).decline(inviteId as SessionInviteId, userId);
  revalidatePath("/community");
}

export interface IncomingSessionInvite {
  id: string;
  inviterUsername: string;
  blockCount: number;
  totalDurationSeconds: number;
}

export async function listIncomingPendingSessionInvites(): Promise<IncomingSessionInvite[]> {
  const { userId, client } = await requireUserId();
  const invites = await new SupabaseSessionInviteRepository(client).listIncomingPending(userId);
  if (invites.length === 0) return [];

  // Los dos ya son amigos aceptados (se exige al crear la invitación), así
  // que la RLS de profiles ("own_or_friend") deja leer su perfil con el
  // propio cliente, sin necesitar clave de servicio.
  const profileRepo = new SupabaseProfileRepository(client);
  const result: IncomingSessionInvite[] = [];
  for (const invite of invites) {
    const profile = await profileRepo.getByOwnerId(invite.inviterId);
    result.push({
      id: invite.id,
      inviterUsername: profile?.username ?? "Usuario",
      blockCount: invite.blocks.length,
      totalDurationSeconds: invite.blocks.reduce((total, b) => total + b.durationSeconds, 0),
    });
  }
  return result;
}

export async function getSessionInvite(inviteId: string) {
  const { userId, client } = await requireUserId();
  return new SupabaseSessionInviteRepository(client).getById(inviteId as SessionInviteId, userId);
}

/**
 * Acepta una invitación: crea las DOS sesiones gemelas (bloques idénticos,
 * mismo orden — de ahí que la réplica del cronómetro pueda emparejarlas por
 * posición más adelante, ver coop-mirror.ts) y las enlaza. La del invitado
 * se crea con su propio cliente autenticado (RLS normal); la del que invita
 * necesita el cliente de servicio, porque quien acepta no es su dueño.
 */
export async function acceptSessionInvite(inviteId: string) {
  const { userId, client } = await requireUserId();
  const inviteRepo = new SupabaseSessionInviteRepository(client);

  const invite = await inviteRepo.getById(inviteId as SessionInviteId, userId);
  if (!invite) throw new Error("Invitación no encontrada.");
  if (invite.inviteeId !== userId) throw new UnauthorizedError();
  if (invite.status !== "pending") throw new Error("Esta invitación ya no está pendiente.");

  const plannedDurationSeconds = invite.blocks.reduce((total, b) => total + b.durationSeconds, 0);
  const serviceClient = createServiceClient();
  const inviteeRepo = new SupabaseSessionRepository(client);
  const inviterRepo = new SupabaseSessionRepository(serviceClient);

  const inviteeSession = await inviteeRepo.start({
    ownerId: userId,
    templateId: invite.templateId,
    plannedDurationSeconds,
    blocks: toNewSessionBlocks(invite.blocks),
  });

  try {
    const inviterSession = await inviterRepo.start({
      ownerId: invite.inviterId,
      templateId: invite.templateId,
      plannedDurationSeconds,
      blocks: toNewSessionBlocks(invite.blocks),
    });

    const profileRepo = new SupabaseProfileRepository(serviceClient);
    const [myProfile, inviterProfile] = await Promise.all([
      profileRepo.getByOwnerId(userId),
      profileRepo.getByOwnerId(invite.inviterId),
    ]);

    await Promise.all([
      inviteeRepo.setLinkedSession(
        inviteeSession.id,
        userId,
        inviterSession.id,
        inviterProfile?.username ?? "",
      ),
      inviterRepo.setLinkedSession(
        inviterSession.id,
        invite.inviterId,
        inviteeSession.id,
        myProfile?.username ?? "",
      ),
    ]);

    await inviteRepo.markAccepted(inviteId as SessionInviteId, userId, {
      inviterSessionId: inviterSession.id,
      inviteeSessionId: inviteeSession.id,
    });

    await notifyPushToUser(invite.inviterId, {
      kind: "session-invite-accepted",
      title: "¡Invitación aceptada!",
      body: `${myProfile?.username ?? "Tu amigo"} ha aceptado — a practicar juntos.`,
      sessionId: inviterSession.id,
    }).catch((error: unknown) => {
      console.error("No se pudo avisar de la invitación aceptada", error);
    });

    revalidatePath("/community");
    return { sessionId: inviteeSession.id as SessionId };
  } catch (error) {
    // La sesión del invitado ya se creó pero se quedó sin pareja — se marca
    // abandonada en vez de dejarla huérfana y sin explicación.
    await inviteeRepo
      .finish(inviteeSession.id, userId, { status: "abandoned", finalNote: null })
      .catch((finishError: unknown) => {
        console.error("No se pudo marcar como abandonada la sesión huérfana", finishError);
      });
    throw error;
  }
}
