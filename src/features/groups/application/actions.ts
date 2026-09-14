"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseGroupRepository } from "@/core/infrastructure/supabase/repositories/group-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseSessionInviteRepository } from "@/core/infrastructure/supabase/repositories/session-invite-repository";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { UnauthorizedError } from "@/core/domain/errors";
import { currentWeekStartKey, weeklyGoalProgress, type WeeklyGoalProgress } from "@/core/domain/weekly-goal";
import { mondayOf } from "@/core/domain/streaks";
import { GROUP_ACTIVITY_PAGE_SIZE } from "@/features/groups/application/constants";
import type { DraftBlockInput } from "@/features/session-builder/application/draft-block";
import type { GroupKind } from "@/core/domain/group";
import type { GroupId, GroupWeeklyGoalId, SessionId, TemplateId, UserId } from "@/core/domain/ids";
import type { InviteDraftBlock } from "@/core/domain/session-invite";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

async function requireMembership(groupId: GroupId, userId: UserId, client: Awaited<ReturnType<typeof createClient>>) {
  const repo = new SupabaseGroupRepository(client);
  const group = await repo.getById(groupId);
  if (!group) throw new Error("Grupo no encontrado.");
  const isMember = await repo.isMember(groupId, userId);
  if (!isMember) throw new UnauthorizedError();
  return { repo, group };
}

export async function createGroup(name: string, kind: GroupKind) {
  const { userId, client } = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Ponle un nombre al grupo.");

  const repo = new SupabaseGroupRepository(client);
  const group = await repo.create({ name: trimmed, kind, ownerId: userId });

  // El insert en group_members no tiene política para el cliente
  // autenticado a propósito (ver la migración) — se une al dueño con la
  // clave de servicio, mismo motivo que unirse por código más abajo.
  await new SupabaseGroupRepository(createServiceClient()).addMember(group.id, userId);

  revalidatePath("/community/groups");
  return group;
}

export interface MyGroup {
  id: string;
  name: string;
  kind: GroupKind;
  ownerId: string;
  memberCount: number;
}

export async function listMyGroups(): Promise<MyGroup[]> {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseGroupRepository(client);
  const groups = await repo.listByMember(userId);

  return Promise.all(
    groups.map(async (group) => ({
      id: group.id,
      name: group.name,
      kind: group.kind,
      ownerId: group.ownerId,
      memberCount: (await repo.listMembers(group.id)).length,
    })),
  );
}

/** Para el diálogo de "invitar al grupo" del creador de sesiones — solo los
 * grupos tipo 'creator' dan ese permiso (ver la migración de session_invites). */
export async function listMyCreatorGroups(): Promise<MyGroup[]> {
  const groups = await listMyGroups();
  return groups.filter((g) => g.kind === "creator");
}

/**
 * Buscar por código necesita ver un grupo del que aún no eres miembro — RLS
 * lo bloquea a propósito (para que no se puedan recorrer/enumerar grupos
 * ajenos), así que esta búsqueda va con la clave de servicio, mismo patrón
 * que getInviterByCode en community/application/actions.ts.
 */
export async function joinGroupByCode(inviteCode: string) {
  const { userId } = await requireUserId();
  const code = inviteCode.trim().toUpperCase();
  if (!code) throw new Error("Introduce un código de grupo.");

  const serviceClient = createServiceClient();
  const repo = new SupabaseGroupRepository(serviceClient);
  const group = await repo.getByInviteCode(code);
  if (!group) throw new Error("Código de grupo no válido.");

  const alreadyMember = await repo.isMember(group.id, userId);
  if (alreadyMember) throw new Error("Ya eres miembro de este grupo.");

  await repo.addMember(group.id, userId);
  revalidatePath("/community/groups");
  return group;
}

export async function leaveGroup(groupId: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseGroupRepository(client);
  await repo.removeMember(groupId as GroupId, userId);
  revalidatePath("/community/groups");
}

export interface GroupMemberInfo {
  ownerId: string;
  username: string;
}

export interface GroupWeeklyGoalInfo {
  id: string;
  targetDays: number;
  targetSeconds: number;
  myProgress: WeeklyGoalProgress;
  myCompletion: boolean;
}

export interface GroupActivityEventInfo {
  id: string;
  actorUsername: string;
  kind: "session_finished" | "weekly_goal_completed";
  createdAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  kind: GroupKind;
  ownerId: string;
  inviteCode: string;
  members: GroupMemberInfo[];
  weeklyGoal: GroupWeeklyGoalInfo | null;
  activity: GroupActivityEventInfo[];
  hasMoreActivity: boolean;
}

async function resolveActorUsernames(
  actorIds: UserId[],
  profileRepo: SupabaseProfileRepository,
): Promise<Map<UserId, string>> {
  const unique = [...new Set(actorIds)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, (await profileRepo.getByOwnerId(id))?.username ?? "Usuario"] as const),
  );
  return new Map(entries);
}

export async function getGroupDetail(groupId: string): Promise<GroupDetail> {
  const { userId, client } = await requireUserId();
  const { repo, group } = await requireMembership(groupId as GroupId, userId, client);

  const profileRepo = new SupabaseProfileRepository(client);
  const [memberIds, activityRows] = await Promise.all([
    repo.listMembers(group.id),
    repo.listActivity(group.id, { limit: GROUP_ACTIVITY_PAGE_SIZE, offset: 0 }),
  ]);

  const usernames = await resolveActorUsernames(
    [...memberIds, ...activityRows.map((a) => a.actorId)],
    profileRepo,
  );

  let weeklyGoal: GroupWeeklyGoalInfo | null = null;
  if (group.kind === "admin") {
    const now = new Date();
    const goal = await repo.getWeeklyGoal(group.id, currentWeekStartKey(now));
    if (goal) {
      const sessionRepo = new SupabaseSessionRepository(client);
      const mySessions = await sessionRepo.listByOwner(userId, { from: mondayOf(now) });
      const progress = weeklyGoalProgress(mySessions, goal);
      const myCompletion = await repo.hasCompletedWeeklyGoal(goal.id, userId);
      weeklyGoal = {
        id: goal.id,
        targetDays: goal.targetDays,
        targetSeconds: goal.targetSeconds,
        myProgress: progress,
        myCompletion,
      };
    }
  }

  return {
    id: group.id,
    name: group.name,
    kind: group.kind,
    ownerId: group.ownerId,
    inviteCode: group.inviteCode,
    members: memberIds.map((id) => ({ ownerId: id, username: usernames.get(id) ?? "Usuario" })),
    weeklyGoal,
    activity: activityRows.map((event) => ({
      id: event.id,
      actorUsername: usernames.get(event.actorId) ?? "Usuario",
      kind: event.kind,
      createdAt: event.createdAt.toISOString(),
    })),
    hasMoreActivity: activityRows.length === GROUP_ACTIVITY_PAGE_SIZE,
  };
}

export async function loadMoreGroupActivity(
  groupId: string,
  offset: number,
): Promise<GroupActivityEventInfo[]> {
  const { userId, client } = await requireUserId();
  const { repo } = await requireMembership(groupId as GroupId, userId, client);

  const rows = await repo.listActivity(groupId as GroupId, {
    limit: GROUP_ACTIVITY_PAGE_SIZE,
    offset,
  });
  const usernames = await resolveActorUsernames(
    rows.map((r) => r.actorId),
    new SupabaseProfileRepository(client),
  );
  return rows.map((event) => ({
    id: event.id,
    actorUsername: usernames.get(event.actorId) ?? "Usuario",
    kind: event.kind,
    createdAt: event.createdAt.toISOString(),
  }));
}

/** Solo el dueño de un grupo 'admin' puede fijar el objetivo — reforzado
 * también por la política de escritura de group_weekly_goals en la
 * migración, esta comprobación es defensa en profundidad. */
export async function setGroupWeeklyGoal(groupId: string, targetDays: number, targetHours: number) {
  const { userId, client } = await requireUserId();
  const { repo, group } = await requireMembership(groupId as GroupId, userId, client);
  if (group.kind !== "admin" || group.ownerId !== userId) throw new UnauthorizedError();

  await repo.upsertWeeklyGoal({
    groupId: group.id,
    weekStart: currentWeekStartKey(new Date()),
    targetDays,
    targetSeconds: Math.round(targetHours * 3600),
  });

  revalidatePath(`/community/groups/${groupId}`);
}

async function notifyGroupMembers(
  groupId: GroupId,
  excludeUserId: UserId,
  memberIds: UserId[],
  payload: Parameters<typeof sendPush>[1],
) {
  const serviceClient = createServiceClient();
  const pushRepo = new SupabasePushSubscriptionRepository(serviceClient);
  const recipients = memberIds.filter((id) => id !== excludeUserId);

  for (const recipientId of recipients) {
    const { data: subscriptions, error } = await serviceClient
      .from("push_subscriptions")
      .select("*")
      .eq("owner_id", recipientId);
    if (error) throw error;
    for (const sub of subscriptions) {
      const result = await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);
      if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
    }
  }
}

/**
 * El miembro marca a mano que ha llegado al objetivo del grupo esa semana
 * (igual que el objetivo personal, ver setWeeklyGoalCompleted) — deja
 * constancia en el muro del grupo y, a diferencia de terminar una sesión
 * cualquiera, SÍ avisa por push al resto de miembros.
 */
export async function markGroupWeeklyGoalCompleted(groupId: string, groupWeeklyGoalId: string) {
  const { userId, client } = await requireUserId();
  const { repo, group } = await requireMembership(groupId as GroupId, userId, client);
  if (group.kind !== "admin") throw new UnauthorizedError();

  await repo.markWeeklyGoalCompleted(groupWeeklyGoalId as GroupWeeklyGoalId, userId);
  await repo.addActivityEvent({
    groupId: group.id,
    actorId: userId,
    kind: "weekly_goal_completed",
    sessionId: null,
  });

  const myProfile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  const memberIds = await repo.listMembers(group.id);
  await notifyGroupMembers(group.id, userId, memberIds, {
    kind: "group-weekly-goal-completed",
    title: `¡Objetivo semanal completado en ${group.name}!`,
    body: `${myProfile?.username ?? "Alguien"} acaba de completar el objetivo semanal.`,
    groupId: group.id,
  }).catch((error: unknown) => {
    console.error("No se pudo avisar del objetivo semanal de grupo completado", error);
  });

  revalidatePath(`/community/groups/${groupId}`);
}

/**
 * Se llama desde finishSession (features/session-timer/application/actions.ts)
 * cada vez que una sesión termina — deja constancia en el muro de TODOS los
 * grupos del usuario, sin avisar por push (a propósito: solo el objetivo
 * semanal de grupo avisa, terminar una sesión suelta sería demasiado ruido).
 */
export async function recordSessionFinishedGroupEvents(userId: UserId, sessionId: SessionId) {
  const client = createServiceClient();
  const repo = new SupabaseGroupRepository(client);
  const groups = await repo.listByMember(userId);

  await Promise.all(
    groups.map((group) =>
      repo.addActivityEvent({
        groupId: group.id,
        actorId: userId,
        kind: "session_finished",
        sessionId,
      }),
    ),
  );
}

/**
 * Invita a TODOS los demás miembros de un grupo 'creator' a la vez — cada
 * uno recibe una invitación de sesión 1 a 1 normal (mismo mecanismo que
 * invitar a un solo amigo, ver session-invites/application/actions.ts),
 * multiplicada por el grupo. No hay cronómetro compartido entre más de dos
 * personas: quien acepte empieza su propia sesión emparejada con la tuya,
 * igual que si te hubiese invitado uno a uno. No se usa createSessionInvite
 * directamente porque esa acción exige amistad aceptada — aquí basta con
 * compartir un grupo 'creator' (reforzado también por RLS, ver la migración).
 */
export async function inviteGroupToSession(
  templateId: string | null,
  blocks: DraftBlockInput[],
  groupId: string,
) {
  const { userId, client } = await requireUserId();
  const { repo, group } = await requireMembership(groupId as GroupId, userId, client);
  if (group.kind !== "creator") throw new UnauthorizedError();

  const memberIds = (await repo.listMembers(group.id)).filter((id) => id !== userId);
  if (memberIds.length === 0) throw new Error("No hay nadie más en este grupo todavía.");

  const myProfile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  const inviteRepo = new SupabaseSessionInviteRepository(client);
  let sent = 0;

  for (const memberId of memberIds) {
    try {
      const invite = await inviteRepo.create({
        inviterId: userId,
        inviteeId: memberId,
        templateId: templateId as TemplateId | null,
        blocks: blocks as InviteDraftBlock[],
      });
      sent += 1;
      if (myProfile) {
        await notifyGroupMembers(group.id, userId, [memberId], {
          kind: "session-invite",
          title: "Invitación a practicar juntos",
          body: `${myProfile.username} os invita a practicar juntos desde el grupo "${group.name}".`,
          inviteId: invite.id,
        }).catch((error: unknown) => {
          console.error("No se pudo avisar de la invitación de grupo a sesión", error);
        });
      }
    } catch (error) {
      console.error(`No se pudo invitar al miembro ${memberId} del grupo`, error);
    }
  }

  revalidatePath("/community");
  return { sent };
}
