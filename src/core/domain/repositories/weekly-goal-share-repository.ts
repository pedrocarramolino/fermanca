import type { WeeklyGoalShare } from "@/core/domain/weekly-goal-share";
import type { UserId, WeeklyGoalShareId } from "@/core/domain/ids";

export interface WeeklyGoalShareRepository {
  create(input: {
    ownerId: UserId;
    ownerUsername: string;
    ownerAvatarUrl: string | null;
    weekStart: string;
    targetDays: number;
    targetSeconds: number;
    practicedDays: number;
    practicedSeconds: number;
    streakDays: number;
  }): Promise<WeeklyGoalShare>;
  /** Mismo criterio que SessionShareRepository.listFeed: la RLS ya limita a
   * lo propio o lo de un amigo aceptado. */
  listFeed(viewerId: UserId, limit: number): Promise<WeeklyGoalShare[]>;
  /** Para que el botón de compartir sepa si el objetivo de esta semana ya
   * está compartido (y ofrezca quitarlo en vez de compartirlo otra vez). */
  findByWeek(ownerId: UserId, weekStart: string): Promise<WeeklyGoalShare | null>;
  remove(id: WeeklyGoalShareId, ownerId: UserId): Promise<void>;
}
