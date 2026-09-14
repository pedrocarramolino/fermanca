import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Group,
  GroupActivityEvent,
  GroupActivityEventKind,
  GroupKind,
  GroupWeeklyGoal,
} from "@/core/domain/group";
import type { GroupId, GroupWeeklyGoalId, SessionId, UserId } from "@/core/domain/ids";
import type { GroupRepository } from "@/core/domain/repositories/group-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type WeeklyGoalRow = Database["public"]["Tables"]["group_weekly_goals"]["Row"];
type ActivityRow = Database["public"]["Tables"]["group_activity_events"]["Row"];

function toGroup(row: GroupRow): Group {
  return {
    id: row.id as GroupId,
    name: row.name,
    kind: row.kind as GroupKind,
    ownerId: row.owner_id as UserId,
    inviteCode: row.invite_code,
    createdAt: new Date(row.created_at),
  };
}

function toWeeklyGoal(row: WeeklyGoalRow): GroupWeeklyGoal {
  return {
    id: row.id as GroupWeeklyGoalId,
    groupId: row.group_id as GroupId,
    weekStart: row.week_start,
    targetDays: row.target_days,
    targetSeconds: row.target_seconds,
    createdAt: new Date(row.created_at),
  };
}

/** Mismo alfabeto que el código de invitación de perfiles (sin 0/O/1/I, se
 * confunden fácil al dictarlos de palabra) — aquí se genera desde la propia
 * aplicación, no con un trigger de BD, porque no hay una fila que se cree
 * sola al registrarse: el código nace junto con el grupo. */
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function randomInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

const UNIQUE_VIOLATION = "23505";
/** Unos pocos reintentos bastan: con 32^6 combinaciones, una colisión es
 * prácticamente imposible salvo mala suerte extrema. */
const MAX_CODE_ATTEMPTS = 5;

export class SupabaseGroupRepository implements GroupRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(input: { name: string; kind: GroupKind; ownerId: UserId }): Promise<Group> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const { data, error } = await this.client
        .from("groups")
        .insert({
          name: input.name,
          kind: input.kind,
          owner_id: input.ownerId,
          invite_code: randomInviteCode(),
        })
        .select("*")
        .single();
      if (!error) return toGroup(data);
      if (error.code !== UNIQUE_VIOLATION) throw error;
    }
    throw new Error("No se pudo generar un código de invitación único para el grupo.");
  }

  async getById(id: GroupId): Promise<Group | null> {
    const { data, error } = await this.client.from("groups").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toGroup(data) : null;
  }

  async getByInviteCode(code: string): Promise<Group | null> {
    const { data, error } = await this.client
      .from("groups")
      .select("*")
      .eq("invite_code", code)
      .maybeSingle();
    if (error) throw error;
    return data ? toGroup(data) : null;
  }

  async listByMember(userId: UserId): Promise<Group[]> {
    const { data: memberships, error: membershipsError } = await this.client
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);
    if (membershipsError) throw membershipsError;
    if (memberships.length === 0) return [];

    const { data, error } = await this.client
      .from("groups")
      .select("*")
      .in(
        "id",
        memberships.map((m) => m.group_id),
      );
    if (error) throw error;
    return data.map(toGroup);
  }

  async addMember(groupId: GroupId, userId: UserId): Promise<void> {
    const { error } = await this.client
      .from("group_members")
      .upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id" });
    if (error) throw error;
  }

  async removeMember(groupId: GroupId, userId: UserId): Promise<void> {
    const { error } = await this.client
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  async isMember(groupId: GroupId, userId: UserId): Promise<boolean> {
    const { data, error } = await this.client
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  }

  async listMembers(groupId: GroupId): Promise<UserId[]> {
    const { data, error } = await this.client
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    if (error) throw error;
    return data.map((row) => row.user_id as UserId);
  }

  async countMembersByGroup(groupIds: GroupId[]): Promise<Map<GroupId, number>> {
    if (groupIds.length === 0) return new Map();
    const { data, error } = await this.client
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds);
    if (error) throw error;

    const counts = new Map<GroupId, number>();
    for (const row of data) {
      const id = row.group_id as GroupId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  async countByMember(userId: UserId): Promise<number> {
    const { count, error } = await this.client
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw error;
    return count ?? 0;
  }

  async getWeeklyGoal(groupId: GroupId, weekStart: string): Promise<GroupWeeklyGoal | null> {
    const { data, error } = await this.client
      .from("group_weekly_goals")
      .select("*")
      .eq("group_id", groupId)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (error) throw error;
    return data ? toWeeklyGoal(data) : null;
  }

  async upsertWeeklyGoal(input: {
    groupId: GroupId;
    weekStart: string;
    targetDays: number;
    targetSeconds: number;
  }): Promise<GroupWeeklyGoal> {
    const { data, error } = await this.client
      .from("group_weekly_goals")
      .upsert(
        {
          group_id: input.groupId,
          week_start: input.weekStart,
          target_days: input.targetDays,
          target_seconds: input.targetSeconds,
        },
        { onConflict: "group_id,week_start" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toWeeklyGoal(data);
  }

  async hasCompletedWeeklyGoal(groupWeeklyGoalId: GroupWeeklyGoalId, userId: UserId): Promise<boolean> {
    const { data, error } = await this.client
      .from("group_weekly_goal_completions")
      .select("id")
      .eq("group_weekly_goal_id", groupWeeklyGoalId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  }

  async markWeeklyGoalCompleted(groupWeeklyGoalId: GroupWeeklyGoalId, userId: UserId): Promise<void> {
    const { error } = await this.client
      .from("group_weekly_goal_completions")
      .upsert(
        { group_weekly_goal_id: groupWeeklyGoalId, user_id: userId },
        { onConflict: "group_weekly_goal_id,user_id" },
      );
    if (error) throw error;
  }

  async addActivityEvent(input: {
    groupId: GroupId;
    actorId: UserId;
    kind: GroupActivityEventKind;
    sessionId: SessionId | null;
  }): Promise<void> {
    const { error } = await this.client.from("group_activity_events").insert({
      group_id: input.groupId,
      actor_id: input.actorId,
      kind: input.kind,
      session_id: input.sessionId,
    });
    if (error) throw error;
  }

  async listActivity(
    groupId: GroupId,
    options: { limit: number; offset: number },
  ): Promise<GroupActivityEvent[]> {
    const { data, error } = await this.client
      .from("group_activity_events")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);
    if (error) throw error;

    return (data as ActivityRow[]).map((row) => ({
      id: row.id as GroupActivityEvent["id"],
      groupId: row.group_id as GroupId,
      actorId: row.actor_id as UserId,
      kind: row.kind as GroupActivityEventKind,
      sessionId: row.session_id as SessionId | null,
      createdAt: new Date(row.created_at),
    }));
  }
}
