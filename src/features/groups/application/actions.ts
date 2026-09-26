"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseGroupRepository } from "@/core/infrastructure/supabase/repositories/group-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseSessionInviteRepository } from "@/core/infrastructure/supabase/repositories/session-invite-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { sendPushToMany } from "@/core/infrastructure/push/send-push-to-many";
import { UnauthorizedError } from "@/core/domain/errors";
import { currentWeekStartKey, weeklyGoalProgress, type WeeklyGoalProgress } from "@/core/domain/weekly-goal";
import { mondayOf } from "@/core/domain/streaks";
import { GROUP_ACTIVITY_PAGE_SIZE } from "@/features/groups/application/constants";
import type { DraftBlockInput } from "@/features/session-builder/application/draft-block";
import type { GroupActivityEvent, GroupKind } from "@/core/domain/group";
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
  // Una sola consulta para el recuento de miembros de TODOS los grupos a la
  // vez — antes hacía una consulta por grupo (N+1), que era lo que hacía
  // lenta la pantalla de Comunidad al cargar cada vez más grupos.
  const counts = await repo.countMembersByGroup(groups.map((g) => g.id));

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    kind: group.kind,
    ownerId: group.ownerId,
    memberCount: counts.get(group.id) ?? 0,
  }));
}

/** Solo cuántos grupos hay, para el contador junto al enlace "Grupos" en
 * Comunidad — a diferencia de listMyGroups, no necesita el nombre/tipo/
 * recuento de miembros de cada uno. */
export async function countMyGroups(): Promise<number> {
  const { userId, client } = await requireUserId();
  return new SupabaseGroupRepository(client).countByMember(userId);
}

/** Para el diálogo de "invitar al grupo" del creador de sesiones — solo los
 * grupos tipo 'creator' dan ese permiso (ver la migración de session_invites). */
export async function listMyCreatorGroups(): Promise<MyGroup[]> {
  const groups = await listMyGroups();
  return groups.filter((g) => g.kind === "creator");
}

/**
 * Para la pantalla pública del enlace de invitación
 * (/community/groups/join/[code]): hace falta poder decir "te han invitado
 * al grupo X" antes incluso de saber si quien abrió el enlace tiene cuenta.
 * Con la clave de servicio porque el grupo no es visible sin sesión (mismo
 * motivo que getInviterByCode) — solo expone el nombre, nada más.
 */
export async function getGroupByInviteCode(code: string): Promise<{ name: string } | null> {
  const group = await new SupabaseGroupRepository(createServiceClient()).getByInviteCode(
    code.trim().toUpperCase(),
  );
  return group ? { name: group.name } : null;
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

/** Expulsar a otro miembro — solo el dueño (reforzado también por la
 * política de borrado de group_members, que ya permite "tú mismo o el
 * dueño"). Para salir tú mismo se usa leaveGroup. */
export async function removeGroupMember(groupId: string, memberUserId: string) {
  const { userId, client } = await requireUserId();
  const { repo, group } = await requireMembership(groupId as GroupId, userId, client);
  if (group.ownerId !== userId) throw new UnauthorizedError();
  if (memberUserId === userId) throw new Error("Usa \"Salir del grupo\" para irte tú mismo.");

  await repo.removeMember(group.id, memberUserId as UserId);
  revalidatePath(`/community/groups/${groupId}`);
}

/** Solo el dueño puede borrar el grupo entero — el resto de miembros lo
 * dejan de ver de inmediato (cascada por FK en la base de datos). */
export async function deleteGroup(groupId: string) {
  const { userId, client } = await requireUserId();
  const { repo, group } = await requireMembership(groupId as GroupId, userId, client);
  if (group.ownerId !== userId) throw new UnauthorizedError();

  await repo.delete(group.id);
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
  /** Duración total y bloques practicados de la sesión — solo para
   * "session_finished" con la sesión todavía existente (null si se borró
   * después, o si el evento es de un objetivo semanal). */
  sessionSummary: {
    totalDurationSeconds: number;
    blocks: { id: string; name: string; color: string; actualDurationSeconds: number }[];
  } | null;
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

/** Duración y bloques practicados de las sesiones detrás de eventos
 * "session_finished" — con la clave de servicio, igual que el resumen
 * público de /compartir/[id] (getPublicSummary nunca expone notas ni de
 * quién es la sesión, así que es seguro leer la de cualquier miembro del
 * grupo, no solo la propia). */
async function resolveSessionSummaries(
  rows: GroupActivityEvent[],
): Promise<Map<SessionId, GroupActivityEventInfo["sessionSummary"]>> {
  const ids = [
    ...new Set(
      rows
        .filter((row) => row.kind === "session_finished" && row.sessionId !== null)
        .map((row) => row.sessionId as SessionId),
    ),
  ];
  if (ids.length === 0) return new Map();

  const sessionRepo = new SupabaseSessionRepository(createServiceClient());
  const entries = await Promise.all(
    ids.map(async (id) => {
      const summary = await sessionRepo.getPublicSummary(id);
      if (!summary) return [id, null] as const;
      return [
        id,
        {
          totalDurationSeconds: summary.blocks.reduce((sum, b) => sum + b.actualDurationSeconds, 0),
          blocks: summary.blocks,
        },
      ] as const;
    }),
  );
  return new Map(entries);
}

function toActivityEventInfo(
  event: GroupActivityEvent,
  actorUsername: string,
  sessionSummaries: Map<SessionId, GroupActivityEventInfo["sessionSummary"]>,
): GroupActivityEventInfo {
  return {
    id: event.id,
    actorUsername,
    kind: event.kind,
    createdAt: event.createdAt.toISOString(),
    sessionSummary: event.sessionId ? (sessionSummaries.get(event.sessionId) ?? null) : null,
  };
}

export async function getGroupDetail(groupId: string): Promise<GroupDetail> {
  const { userId, client } = await requireUserId();
  const { repo, group } = await requireMembership(groupId as GroupId, userId, client);

  const profileRepo = new SupabaseProfileRepository(client);
  const [memberIds, activityRows] = await Promise.all([
    repo.listMembers(group.id),
    repo.listActivity(group.id, { limit: GROUP_ACTIVITY_PAGE_SIZE, offset: 0 }),
  ]);

  const [usernames, sessionSummaries] = await Promise.all([
    resolveActorUsernames([...memberIds, ...activityRows.map((a) => a.actorId)], profileRepo),
    resolveSessionSummaries(activityRows),
  ]);

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
    activity: activityRows.map((event) =>
      toActivityEventInfo(event, usernames.get(event.actorId) ?? "Usuario", sessionSummaries),
    ),
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
  const [usernames, sessionSummaries] = await Promise.all([
    resolveActorUsernames(
      rows.map((r) => r.actorId),
      new SupabaseProfileRepository(client),
    ),
    resolveSessionSummaries(rows),
  ]);
  return rows.map((event) =>
    toActivityEventInfo(event, usernames.get(event.actorId) ?? "Usuario", sessionSummaries),
  );
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
  // Antes era una consulta por miembro y un envío detrás de otro: en un
  // grupo grande, el que marcaba el objetivo se quedaba esperando minutos.
  await sendPushToMany(
    createServiceClient(),
    { ownerIds: memberIds.filter((id) => id !== excludeUserId) },
    payload,
  );
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
    image: GROUP_WEEKLY_GOAL_PUSH_IMAGE,
  }).catch((error: unknown) => {
    console.error("No se pudo avisar del objetivo semanal de grupo completado", error);
  });

  revalidatePath(`/community/groups/${groupId}`);
}

/** Icono grande de la app, reutilizado como imagen de la notificación de
 * objetivo semanal de grupo completado (ver GroupWeeklyGoalCompletedPushPayload) —
 * solo la pintan Android/Chrome, el resto de plataformas la ignora sin más. */
const GROUP_WEEKLY_GOAL_PUSH_IMAGE = "/icons/icon-512x512.png";

/**
 * Manda el mismo push de "objetivo semanal completado" pero SOLO a quien lo
 * pide, a sus propias suscripciones — para poder ver cómo queda (incluida la
 * imagen) sin avisar de mentira al resto del grupo.
 */
export async function sendTestGroupWeeklyGoalPush(groupId: string) {
  const { userId, client } = await requireUserId();
  const { group } = await requireMembership(groupId as GroupId, userId, client);

  const myProfile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  const serviceClient = createServiceClient();
  const { data: subscriptions, error } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", userId);
  if (error) throw error;
  if (subscriptions.length === 0) {
    throw new Error("No tienes notificaciones activadas en este dispositivo.");
  }

  for (const sub of subscriptions) {
    await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "group-weekly-goal-completed",
        title: `¡Objetivo semanal completado en ${group.name}!`,
        body: `${myProfile?.username ?? "Alguien"} acaba de completar el objetivo semanal.`,
        groupId: group.id,
        image: GROUP_WEEKLY_GOAL_PUSH_IMAGE,
      },
    );
  }
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
