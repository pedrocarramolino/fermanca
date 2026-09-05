import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserId, WeeklyGoalShareId } from "@/core/domain/ids";
import type {
  WeeklyGoalShareReactionRepository,
  WeeklyGoalShareReactionRow,
} from "@/core/domain/repositories/weekly-goal-share-reaction-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

export class SupabaseWeeklyGoalShareReactionRepository implements WeeklyGoalShareReactionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForShares(shareIds: WeeklyGoalShareId[]): Promise<WeeklyGoalShareReactionRow[]> {
    if (shareIds.length === 0) return [];
    const { data, error } = await this.client
      .from("weekly_goal_share_reactions")
      .select("weekly_goal_share_id, owner_id, emoji")
      .in("weekly_goal_share_id", shareIds);
    if (error) throw error;
    return data.map((row) => ({
      weeklyGoalShareId: row.weekly_goal_share_id as WeeklyGoalShareId,
      ownerId: row.owner_id as UserId,
      emoji: row.emoji,
    }));
  }

  async toggle(shareId: WeeklyGoalShareId, ownerId: UserId, emoji: string): Promise<boolean> {
    const { data: deleted, error: deleteError } = await this.client
      .from("weekly_goal_share_reactions")
      .delete()
      .eq("weekly_goal_share_id", shareId)
      .eq("owner_id", ownerId)
      .eq("emoji", emoji)
      .select("id");
    if (deleteError) throw deleteError;
    if (deleted.length > 0) return false;

    const { error: insertError } = await this.client
      .from("weekly_goal_share_reactions")
      .insert({ weekly_goal_share_id: shareId, owner_id: ownerId, emoji });
    if (insertError) throw insertError;
    return true;
  }
}
