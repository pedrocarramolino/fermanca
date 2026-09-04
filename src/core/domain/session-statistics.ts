import { hasPracticedTime, type Session } from "@/core/domain/session";

/** Sesiones que cuentan para las estadísticas: no las que aún están en curso. */
function finishedSessions(sessions: Session[]): Session[] {
  return sessions.filter((session) => session.status !== "in_progress");
}

export function totalPracticedSeconds(sessions: Session[]): number {
  return finishedSessions(sessions).reduce((total, s) => total + s.actualDurationSeconds, 0);
}

export function sessionsCount(sessions: Session[]): number {
  return finishedSessions(sessions).length;
}

export function averageSessionSeconds(sessions: Session[]): number {
  const finished = finishedSessions(sessions);
  if (finished.length === 0) return 0;
  return totalPracticedSeconds(sessions) / finished.length;
}

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // semana empieza en lunes
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export interface TimeBucket {
  bucketStart: Date;
  seconds: number;
}

/** Últimas `weeks` semanas (lunes a domingo, UTC), la actual incluida y en último lugar. */
export function weeklySeries(sessions: Session[], weeks: number, now: Date): TimeBucket[] {
  const currentWeekStart = startOfUtcWeek(now);
  const buckets: TimeBucket[] = Array.from({ length: weeks }, (_, i) => {
    const bucketStart = new Date(currentWeekStart);
    bucketStart.setUTCDate(bucketStart.getUTCDate() - 7 * (weeks - 1 - i));
    return { bucketStart, seconds: 0 };
  });

  for (const session of finishedSessions(sessions)) {
    const weekStart = startOfUtcWeek(session.startedAt).getTime();
    const bucket = buckets.find((b) => b.bucketStart.getTime() === weekStart);
    if (bucket) bucket.seconds += session.actualDurationSeconds;
  }

  return buckets;
}

/** Últimos `months` meses naturales (UTC), el actual incluido y en último lugar. */
export function monthlySeries(sessions: Session[], months: number, now: Date): TimeBucket[] {
  const currentMonthStart = startOfUtcMonth(now);
  const buckets: TimeBucket[] = Array.from({ length: months }, (_, i) => {
    const bucketStart = new Date(currentMonthStart);
    bucketStart.setUTCMonth(bucketStart.getUTCMonth() - (months - 1 - i));
    return { bucketStart, seconds: 0 };
  });

  for (const session of finishedSessions(sessions)) {
    const monthStart = startOfUtcMonth(session.startedAt).getTime();
    const bucket = buckets.find((b) => b.bucketStart.getTime() === monthStart);
    if (bucket) bucket.seconds += session.actualDurationSeconds;
  }

  return buckets;
}

export interface CategoryStat {
  categoryId: string;
  name: string;
  color: string;
  seconds: number;
  blockCount: number;
}

/** Agregado por categoría (vía categoryId de cada bloque), ordenado de más a menos tiempo. */
export function categoryBreakdown(sessions: Session[]): CategoryStat[] {
  const byCategory = new Map<string, CategoryStat>();

  for (const session of finishedSessions(sessions)) {
    for (const block of session.blocks.filter(hasPracticedTime)) {
      const existing = byCategory.get(block.categoryId);
      if (existing) {
        existing.seconds += block.actualDurationSeconds;
        existing.blockCount += 1;
        // El color/nombre puede variar si el usuario renombró un bloque
        // suelto; nos quedamos con el más reciente como representativo.
        existing.name = block.name;
        existing.color = block.color;
      } else {
        byCategory.set(block.categoryId, {
          categoryId: block.categoryId,
          name: block.name,
          color: block.color,
          seconds: block.actualDurationSeconds,
          blockCount: 1,
        });
      }
    }
  }

  return [...byCategory.values()].sort((a, b) => b.seconds - a.seconds);
}

/** Colapsa lo que quede más allá de `topN` en una fila "Otras" (gris, no
 * categórica) — `othersLabel` lo traduce quien llama, ya que este módulo de
 * dominio no depende de next-intl. */
export function foldIntoOthers(
  stats: CategoryStat[],
  topN: number,
  othersLabel = "Otras",
): CategoryStat[] {
  if (stats.length <= topN) return stats;
  const head = stats.slice(0, topN);
  const tail = stats.slice(topN);
  const others: CategoryStat = {
    categoryId: "__others__",
    name: othersLabel,
    color: "var(--muted-foreground)",
    seconds: tail.reduce((total, s) => total + s.seconds, 0),
    blockCount: tail.reduce((total, s) => total + s.blockCount, 0),
  };
  return [...head, others];
}
