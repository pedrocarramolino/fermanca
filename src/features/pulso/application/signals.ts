import type { Category } from "@/core/domain/category";
import type { Session } from "@/core/domain/session";
import { currentStreakDays, practiceSecondsByDay } from "@/core/domain/streaks";
import type { CategoryId } from "@/core/domain/ids";

type BalancedSlug = "technique" | "repertoire";

/** Cuántas de las últimas sesiones tienen que compartir la misma categoría
 * dominante para que Pulso sugiera cambiar de aire. */
const DOMINANT_STREAK_SESSIONS = 3;
/** Ventana de sesiones recientes sobre la que se mide el reparto
 * técnica/repertorio para la opción "usar mi progreso reciente". */
const RECENT_PROGRESS_SESSIONS = 8;

export interface PulsoSignals {
  currentStreak: number;
  /** null si nunca se ha completado ninguna sesión. */
  daysSinceLastPractice: number | null;
  /** Categoría (técnica u obras) que ha dominado las últimas sesiones, si
   * las últimas `DOMINANT_STREAK_SESSIONS` coinciden — null si no hay
   * suficientes sesiones o están repartidas entre varias categorías. */
  dominantRecentCategory: BalancedSlug | null;
  /** Minutos practicados recientemente en técnica y repertorio, para poder
   * corregir el reparto de hoy hacia la que se ha descuidado. */
  recentCategoryMinutes: { technique: number; repertoire: number };
}

function systemSlugById(categories: Category[]): Map<CategoryId, BalancedSlug> {
  const map = new Map<CategoryId, BalancedSlug>();
  for (const category of categories) {
    if (category.kind === "system" && (category.slug === "technique" || category.slug === "repertoire")) {
      map.set(category.id, category.slug);
    }
  }
  return map;
}

/** Categoría (técnica/repertorio) con más tiempo real practicado dentro de
 * una sesión — null si no tiene bloques de ninguna de las dos con tiempo
 * practicado. */
function dominantCategoryOf(
  session: Session,
  slugById: Map<CategoryId, BalancedSlug>,
): BalancedSlug | null {
  const totals: Record<BalancedSlug, number> = { technique: 0, repertoire: 0 };
  for (const block of session.blocks) {
    const slug = slugById.get(block.categoryId);
    if (slug) totals[slug] += block.actualDurationSeconds;
  }
  if (totals.technique === 0 && totals.repertoire === 0) return null;
  return totals.technique >= totals.repertoire ? "technique" : "repertoire";
}

export function buildPulsoSignals(
  sessions: Session[],
  categories: Category[],
  now: Date,
): PulsoSignals {
  const slugById = systemSlugById(categories);
  const finished = sessions.filter((s) => s.status !== "in_progress");
  const byRecency = [...finished].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  const currentStreak = currentStreakDays(practiceSecondsByDay(sessions), now);

  const mostRecentEnd = byRecency[0]?.endedAt ?? byRecency[0]?.startedAt ?? null;
  const daysSinceLastPractice = mostRecentEnd
    ? Math.floor((now.getTime() - mostRecentEnd.getTime()) / 86_400_000)
    : null;

  const lastFew = byRecency.slice(0, DOMINANT_STREAK_SESSIONS);
  const dominantPerSession = lastFew.map((session) => dominantCategoryOf(session, slugById));
  const firstDominant = dominantPerSession[0] ?? null;
  const dominantRecentCategory =
    lastFew.length === DOMINANT_STREAK_SESSIONS &&
    firstDominant !== null &&
    dominantPerSession.every((slug) => slug === firstDominant)
      ? firstDominant
      : null;

  const recentCategoryMinutes = { technique: 0, repertoire: 0 };
  for (const session of byRecency.slice(0, RECENT_PROGRESS_SESSIONS)) {
    for (const block of session.blocks) {
      const slug = slugById.get(block.categoryId);
      if (slug) recentCategoryMinutes[slug] += block.actualDurationSeconds / 60;
    }
  }

  return {
    currentStreak,
    daysSinceLastPractice,
    dominantRecentCategory,
    recentCategoryMinutes,
  };
}
