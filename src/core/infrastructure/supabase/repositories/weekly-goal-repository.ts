import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeeklyGoal } from "@/core/domain/weekly-goal";
import type { UserId, WeeklyGoalId } from "@/core/domain/ids";
import type {
  NewWeeklyGoal,
  WeeklyGoalRepository,
} from "@/core/domain/repositories/weekly-goal-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["weekly_goals"]["Row"];

function toDomain(row: Row): WeeklyGoal {
  return {
    id: row.id as WeeklyGoalId,
    ownerId: row.owner_id as UserId,
    weekStart: row.week_start,
    targetDays: row.target_days,
    targetSeconds: row.target_seconds,
    completed: row.completed,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseWeeklyGoalRepository implements WeeklyGoalRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getForWeek(ownerId: UserId, weekStart: string): Promise<WeeklyGoal | null> {
    const { data, error } = await this.client
      .from("weekly_goals")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async upsert(ownerId: UserId, input: NewWeeklyGoal): Promise<WeeklyGoal> {
    const { data, error } = await this.client
      .from("weekly_goals")
      .upsert(
        {
          owner_id: ownerId,
          week_start: input.weekStart,
          target_days: input.targetDays,
          target_seconds: input.targetSeconds,
        },
        { onConflict: "owner_id,week_start" },
      )
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(data);
  }

  async setCompleted(id: WeeklyGoalId, ownerId: UserId, completed: boolean): Promise<WeeklyGoal> {
    const { data, error } = await this.client
      .from("weekly_goals")
      .update({ completed })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(data);
  }
}
