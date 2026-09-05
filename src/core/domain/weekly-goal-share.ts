import type { ReactionSummary } from "@/core/domain/reaction";
import type { UserId, WeeklyGoalShareId } from "@/core/domain/ids";

/** Instantánea de un objetivo semanal cumplido, publicada en el Feed — no
 * referencia una sesión (a diferencia de SessionShare): agrega la práctica
 * de toda la semana, no de una sola. */
export interface WeeklyGoalShare {
  id: WeeklyGoalShareId;
  ownerId: UserId;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  /** "YYYY-MM-DD", el lunes de la semana cumplida. */
  weekStart: string;
  targetDays: number;
  targetSeconds: number;
  practicedDays: number;
  practicedSeconds: number;
  streakDays: number;
  createdAt: Date;
  /** Solo los emojis con al menos una reacción — se calcula al listar el
   * feed (tabla aparte, weekly_goal_share_reactions), igual que en
   * SessionShare. */
  reactions: ReactionSummary[];
}
