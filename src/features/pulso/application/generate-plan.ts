import type { Category, SystemCategory } from "@/core/domain/category";

export const PULSO_INTENTIONS = ["technique", "repertoire", "prepare"] as const;
export type PulsoIntention = (typeof PULSO_INTENTIONS)[number];

export const PULSO_TIME_OPTIONS = [15, 30, 45, 60] as const;
export type PulsoTimeOption = (typeof PULSO_TIME_OPTIONS)[number];

export type PulsoPhaseSlug = "warmup" | "technique" | "repertoire" | "closing";

export interface PulsoPhase {
  slug: PulsoPhaseSlug;
  categoryId: string;
  color: string;
  durationSeconds: number;
}

/** Cuánto del tiempo total se lleva cada fase según qué se quiera trabajar
 * — siempre suma 1, así el reparto real solo depende de las fases que
 * sobrevivan al filtro de duración mínima (ver más abajo). */
const INTENTION_WEIGHTS: Record<
  PulsoIntention,
  Record<Exclude<PulsoPhaseSlug, never>, number>
> = {
  technique: { warmup: 0.15, technique: 0.55, repertoire: 0.2, closing: 0.1 },
  repertoire: { warmup: 0.15, technique: 0.2, repertoire: 0.55, closing: 0.1 },
  prepare: { warmup: 0.1, technique: 0.25, repertoire: 0.45, closing: 0.2 },
};

/** Por debajo de esto una fase es demasiado corta para valer la pena como
 * bloque independiente (apenas da tiempo a nada) — su peso se reparte entre
 * el resto en vez de generar un bloque de, p. ej., 40 segundos. */
const MIN_PHASE_SECONDS = 180;

function isSystemCategory(category: Category): category is SystemCategory {
  return category.kind === "system";
}

/**
 * Genera el plan de una sesión (fases con categoría y duración) a partir de
 * la intención elegida y el tiempo disponible — la lógica detrás del flujo
 * guiado de Pulso. Devuelve `null` si faltan las categorías de sistema
 * necesarias (no debería pasar: se siembran en cada proyecto nuevo).
 */
export function generatePulsoPlan(
  intention: PulsoIntention,
  totalMinutes: number,
  categories: Category[],
): PulsoPhase[] | null {
  const bySlug = new Map(categories.filter(isSystemCategory).map((c) => [c.slug, c]));
  const warmup = bySlug.get("warmup");
  const technique = bySlug.get("technique");
  const repertoire = bySlug.get("repertoire");
  if (!warmup || !technique || !repertoire) return null;

  const totalSeconds = Math.round(totalMinutes * 60);
  const weights = INTENTION_WEIGHTS[intention];

  let candidates: { slug: PulsoPhaseSlug; category: SystemCategory; weight: number }[] = [
    { slug: "warmup", category: warmup, weight: weights.warmup },
    { slug: "technique", category: technique, weight: weights.technique },
    { slug: "repertoire", category: repertoire, weight: weights.repertoire },
    // "Repaso y cierre" reutiliza la categoría de repertorio (un repaso final
    // de las obras trabajadas) con un nombre de bloque propio.
    { slug: "closing", category: repertoire, weight: weights.closing },
  ];

  // Repetir hasta que ninguna fase restante quede por debajo del mínimo —
  // quitar una cambia el reparto de las demás, así que puede hacer falta
  // más de una pasada.
  for (;;) {
    const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0);
    const tooShort = candidates.filter(
      (p) => (p.weight / totalWeight) * totalSeconds < MIN_PHASE_SECONDS,
    );
    if (tooShort.length === 0 || tooShort.length === candidates.length) break;
    candidates = candidates.filter((p) => !tooShort.includes(p));
  }

  const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0);
  const phases: PulsoPhase[] = candidates.map((p) => ({
    slug: p.slug,
    categoryId: p.category.id,
    color: p.category.color,
    durationSeconds: Math.round((p.weight / totalWeight) * totalSeconds),
  }));

  // El redondeo de cada fase por separado puede dejar el total unos segundos
  // corto o largo respecto al tiempo elegido — se ajusta en la fase más
  // larga, donde unos segundos de más o de menos no se notan.
  const roundedTotal = phases.reduce((sum, p) => sum + p.durationSeconds, 0);
  const diff = totalSeconds - roundedTotal;
  if (diff !== 0 && phases.length > 0) {
    const largest = phases.reduce((a, b) => (b.durationSeconds > a.durationSeconds ? b : a));
    largest.durationSeconds += diff;
  }

  return phases;
}
