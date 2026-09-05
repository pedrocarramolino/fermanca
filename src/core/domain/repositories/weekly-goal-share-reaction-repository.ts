import type { UserId, WeeklyGoalShareId } from "@/core/domain/ids";

export interface WeeklyGoalShareReactionRow {
  weeklyGoalShareId: WeeklyGoalShareId;
  ownerId: UserId;
  emoji: string;
}

/** Mismo contrato que SessionShareReactionRepository, para
 * weekly_goal_shares en vez de session_shares. */
export interface WeeklyGoalShareReactionRepository {
  listForShares(shareIds: WeeklyGoalShareId[]): Promise<WeeklyGoalShareReactionRow[]>;
  toggle(shareId: WeeklyGoalShareId, ownerId: UserId, emoji: string): Promise<boolean>;
}
