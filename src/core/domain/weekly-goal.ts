import type { Session } from "@/core/domain/session";
import type { UserId, WeeklyGoalId } from "@/core/domain/ids";
import { dayKey, mondayOf, practiceSecondsByDay } from "@/core/domain/streaks";

export interface WeeklyGoal {
  id: WeeklyGoalId;
  ownerId: UserId;
  /** "YYYY-MM-DD", siempre el lunes de la semana a la que pertenece. */
  weekStart: string;
  /** 1-7. */
  targetDays: number;
  targetSeconds: number;
  /** Marca manual del usuario al alcanzar el objetivo, no automática. */
  completed: boolean;
  createdAt: Date;
}

/** "YYYY-MM-DD" del lunes de la semana que contiene `today` — clave para
 * buscar/guardar el objetivo de "esta semana". */
export function currentWeekStartKey(today: Date): string {
  return dayKey(mondayOf(today));
}

export interface WeeklyGoalProgress {
  practicedDays: number;
  practicedSeconds: number;
  /** 0-100, sin techo artificial salvo el propio 100. */
  daysPercentage: number;
  secondsPercentage: number;
  /** Se ha llegado a las horas objetivo (no hace falta llegar a los días). */
  reached: boolean;
}

/** `sessions` debe venir ya acotada a la semana del objetivo (p. ej. con el
 * filtro `from` del repositorio) — esta función no vuelve a filtrar por fecha. */
export function weeklyGoalProgress(
  sessions: Session[],
  goal: Pick<WeeklyGoal, "targetDays" | "targetSeconds">,
): WeeklyGoalProgress {
  const byDay = practiceSecondsByDay(sessions);
  const practicedDays = byDay.size;
  const practicedSeconds = [...byDay.values()].reduce((total, seconds) => total + seconds, 0);

  return {
    practicedDays,
    practicedSeconds,
    daysPercentage: Math.min(100, Math.round((practicedDays / goal.targetDays) * 100)),
    secondsPercentage: Math.min(100, Math.round((practicedSeconds / goal.targetSeconds) * 100)),
    reached: practicedSeconds >= goal.targetSeconds,
  };
}
