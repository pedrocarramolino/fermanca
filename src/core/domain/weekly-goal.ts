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

/** Una semana tiene 168 horas: más que eso no se puede practicar. */
export const MAX_WEEKLY_GOAL_HOURS = 168;

/** Horas escritas a mano ("3", "1,5", "0.75") → número, o null si no es
 * una cantidad válida (vacío, no numérico, 0 o más de una semana). */
export function parseWeeklyGoalHours(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(normalized)) return null;
  const hours = Number(normalized);
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_WEEKLY_GOAL_HOURS) return null;
  return hours;
}

/** Comprobación del servidor: lo que llega de una acción no es de fiar. */
export function isValidWeeklyGoalTarget(targetDays: number, targetHours: number): boolean {
  return (
    Number.isInteger(targetDays) &&
    targetDays >= 1 &&
    targetDays <= 7 &&
    Number.isFinite(targetHours) &&
    targetHours > 0 &&
    targetHours <= MAX_WEEKLY_GOAL_HOURS
  );
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
