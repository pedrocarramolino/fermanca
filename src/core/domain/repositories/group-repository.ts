import type { Group, GroupActivityEvent, GroupActivityEventKind, GroupKind, GroupWeeklyGoal } from "@/core/domain/group";
import type { GroupId, GroupWeeklyGoalId, SessionId, UserId } from "@/core/domain/ids";

export interface GroupRepository {
  create(input: { name: string; kind: GroupKind; ownerId: UserId }): Promise<Group>;
  getById(id: GroupId): Promise<Group | null>;
  getByInviteCode(code: string): Promise<Group | null>;
  /** Grupos de los que `userId` es miembro (dueño incluido, es miembro de su
   * propio grupo desde que lo crea). */
  listByMember(userId: UserId): Promise<Group[]>;
  addMember(groupId: GroupId, userId: UserId): Promise<void>;
  removeMember(groupId: GroupId, userId: UserId): Promise<void>;
  isMember(groupId: GroupId, userId: UserId): Promise<boolean>;
  /** owner_id incluido: por convención el dueño es también un GroupMember. */
  listMembers(groupId: GroupId): Promise<UserId[]>;
  /** Nº de miembros de cada grupo en una sola consulta — evita N+1 al listar
   * varios grupos (ver listMyGroups en la capa de aplicación). */
  countMembersByGroup(groupIds: GroupId[]): Promise<Map<GroupId, number>>;
  /** Solo el número total de grupos de los que es miembro — para el
   * contador de Comunidad, que no necesita nada más de cada grupo. */
  countByMember(userId: UserId): Promise<number>;

  getWeeklyGoal(groupId: GroupId, weekStart: string): Promise<GroupWeeklyGoal | null>;
  upsertWeeklyGoal(input: {
    groupId: GroupId;
    weekStart: string;
    targetDays: number;
    targetSeconds: number;
  }): Promise<GroupWeeklyGoal>;
  hasCompletedWeeklyGoal(groupWeeklyGoalId: GroupWeeklyGoalId, userId: UserId): Promise<boolean>;
  markWeeklyGoalCompleted(groupWeeklyGoalId: GroupWeeklyGoalId, userId: UserId): Promise<void>;

  addActivityEvent(input: {
    groupId: GroupId;
    actorId: UserId;
    kind: GroupActivityEventKind;
    sessionId: SessionId | null;
  }): Promise<void>;
  listActivity(groupId: GroupId, options: { limit: number; offset: number }): Promise<GroupActivityEvent[]>;
}
