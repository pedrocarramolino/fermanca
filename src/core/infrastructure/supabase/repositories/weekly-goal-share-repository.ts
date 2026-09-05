import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeeklyGoalShare } from "@/core/domain/weekly-goal-share";
import type { UserId, WeeklyGoalShareId } from "@/core/domain/ids";
import type { WeeklyGoalShareRepository } from "@/core/domain/repositories/weekly-goal-share-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["weekly_goal_shares"]["Row"];

function toDomain(row: Row): WeeklyGoalShare {
  return {
    id: row.id as WeeklyGoalShareId,
    ownerId: row.owner_id as UserId,
    ownerUsername: row.owner_username,
    ownerAvatarUrl: row.owner_avatar_url,
    weekStart: row.week_start,
    targetDays: row.target_days,
    targetSeconds: row.target_seconds,
    practicedDays: row.practiced_days,
    practicedSeconds: row.practiced_seconds,
    streakDays: row.streak_days,
    createdAt: new Date(row.created_at),
    // Se calculan aparte (tabla weekly_goal_share_reactions) y las rellena
    // quien llama cuando las necesita — ver listFeed() en application/actions.ts.
    reactions: [],
  };
}

export class SupabaseWeeklyGoalShareRepository implements WeeklyGoalShareRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(input: {
    ownerId: UserId;
    ownerUsername: string;
    ownerAvatarUrl: string | null;
    weekStart: string;
    targetDays: number;
    targetSeconds: number;
    practicedDays: number;
    practicedSeconds: number;
    streakDays: number;
  }): Promise<WeeklyGoalShare> {
    const { data, error } = await this.client
      .from("weekly_goal_shares")
      .insert({
        owner_id: input.ownerId,
        owner_username: input.ownerUsername,
        owner_avatar_url: input.ownerAvatarUrl,
        week_start: input.weekStart,
        target_days: input.targetDays,
        target_seconds: input.targetSeconds,
        practiced_days: input.practicedDays,
        practiced_seconds: input.practicedSeconds,
        streak_days: input.streakDays,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async listFeed(_viewerId: UserId, limit: number): Promise<WeeklyGoalShare[]> {
    const { data, error } = await this.client
      .from("weekly_goal_shares")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map(toDomain);
  }

  async getById(id: WeeklyGoalShareId): Promise<WeeklyGoalShare | null> {
    const { data, error } = await this.client
      .from("weekly_goal_shares")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async findByWeek(ownerId: UserId, weekStart: string): Promise<WeeklyGoalShare | null> {
    const { data, error } = await this.client
      .from("weekly_goal_shares")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async remove(id: WeeklyGoalShareId, ownerId: UserId): Promise<void> {
    const { error } = await this.client
      .from("weekly_goal_shares")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }
}
