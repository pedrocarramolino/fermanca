import type { WeeklyGoal } from "@/core/domain/weekly-goal";
import type { UserId, WeeklyGoalId } from "@/core/domain/ids";

export interface NewWeeklyGoal {
  weekStart: string;
  targetDays: number;
  targetSeconds: number;
}

export interface WeeklyGoalRepository {
  getForWeek(ownerId: UserId, weekStart: string): Promise<WeeklyGoal | null>;
  /** Crea el objetivo de esa semana o actualiza sus objetivos si ya existía. */
  upsert(ownerId: UserId, input: NewWeeklyGoal): Promise<WeeklyGoal>;
  setCompleted(id: WeeklyGoalId, ownerId: UserId, completed: boolean): Promise<WeeklyGoal>;
}
