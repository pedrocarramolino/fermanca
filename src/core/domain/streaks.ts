import type { Session } from "@/core/domain/session";

/** "YYYY-MM-DD" en UTC — misma convención de "día" que las estadísticas (Fase 7). */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Segundos totales practicados por día (solo sesiones no en curso). */
export function practiceSecondsByDay(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const session of sessions) {
    if (session.status === "in_progress") continue;
    const key = dayKey(session.startedAt);
    map.set(key, (map.get(key) ?? 0) + session.actualDurationSeconds);
  }
  return map;
}

/**
 * Racha actual: días consecutivos hasta hoy con al menos una sesión. Si hoy
 * todavía no se ha practicado, la racha sigue contando desde ayer hacia atrás
 * (no se da por rota hasta que pasa un día entero sin practicar).
 */
export function currentStreakDays(byDay: Map<string, number>, today: Date): number {
  let cursor = byDay.has(dayKey(today)) ? today : addDays(today, -1);
  if (!byDay.has(dayKey(cursor))) return 0;

  let streak = 0;
  while (byDay.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** La racha más larga de toda la historia, haya terminado ya o no. */
export function bestStreakDays(byDay: Map<string, number>): number {
  if (byDay.size === 0) return 0;
  const days = [...byDay.keys()].sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00.000Z");
    const isConsecutive = dayKey(addDays(prev, 1)) === days[i];
    current = isConsecutive ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}

export interface WeeklyCompliance {
  practicedDays: number;
  totalDays: number;
  percentage: number;
}

/** % de días de la semana natural (lunes-domingo) en los que se ha practicado. */
export function weeklyCompliance(byDay: Map<string, number>, today: Date): WeeklyCompliance {
  const day = today.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = addDays(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
    -mondayOffset,
  );

  let practicedDays = 0;
  for (let i = 0; i < 7; i++) {
    if (byDay.has(dayKey(addDays(monday, i)))) practicedDays += 1;
  }
  return { practicedDays, totalDays: 7, percentage: Math.round((practicedDays / 7) * 100) };
}

export interface HeatmapCell {
  date: Date;
  seconds: number;
  /** 0 (sin práctica) a 4 (mucha), para el color del calendario. */
  level: 0 | 1 | 2 | 3 | 4;
}

function levelFor(seconds: number): HeatmapCell["level"] {
  if (seconds <= 0) return 0;
  if (seconds < 15 * 60) return 1;
  if (seconds < 30 * 60) return 2;
  if (seconds < 60 * 60) return 3;
  return 4;
}

/**
 * Cuadrícula semana×día (lunes arriba... domingo abajo, semanas de más
 * antigua a más reciente) de las últimas `weeks` semanas, terminando en la
 * semana de `today`, para el calendario de actividad estilo GitHub.
 */
export function activityHeatmap(
  byDay: Map<string, number>,
  weeks: number,
  today: Date,
): HeatmapCell[][] {
  const day = today.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const currentWeekMonday = addDays(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
    -mondayOffset,
  );
  const firstWeekMonday = addDays(currentWeekMonday, -7 * (weeks - 1));

  return Array.from({ length: weeks }, (_, w) => {
    const weekStart = addDays(firstWeekMonday, 7 * w);
    return Array.from({ length: 7 }, (_, d) => {
      const date = addDays(weekStart, d);
      const seconds = byDay.get(dayKey(date)) ?? 0;
      return { date, seconds, level: levelFor(seconds) };
    });
  });
}
