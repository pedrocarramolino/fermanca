import type { GroupActivityEventId, GroupId, GroupWeeklyGoalId, SessionId, UserId } from "@/core/domain/ids";

/** 'admin' → estilo clase/profesor: el dueño puede fijar el objetivo
 * semanal del grupo. 'creator' → estilo grupo de amigos: cualquier
 * miembro puede invitar a todo el grupo a una sesión. */
export type GroupKind = "admin" | "creator";

export interface Group {
  id: GroupId;
  name: string;
  kind: GroupKind;
  ownerId: UserId;
  inviteCode: string;
  createdAt: Date;
}

export interface GroupMember {
  ownerId: UserId;
  username: string;
  avatarUrl: string | null;
  joinedAt: Date;
}

export interface GroupWeeklyGoal {
  id: GroupWeeklyGoalId;
  groupId: GroupId;
  /** "YYYY-MM-DD", siempre el lunes de la semana a la que pertenece. */
  weekStart: string;
  targetDays: number;
  targetSeconds: number;
  createdAt: Date;
}

export type GroupActivityEventKind = "session_finished" | "weekly_goal_completed";

export interface GroupActivityEvent {
  id: GroupActivityEventId;
  groupId: GroupId;
  actorId: UserId;
  kind: GroupActivityEventKind;
  sessionId: SessionId | null;
  createdAt: Date;
}
