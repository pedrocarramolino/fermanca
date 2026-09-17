import type { Category, SystemCategory } from "@/core/domain/category";

export const PULSO_INTENTIONS = [
  "technique",
  "repertoire",
  "prepare",
  "concentration",
  "other",
] as const;
export type PulsoIntention = (typeof PULSO_INTENTIONS)[number];

export const PULSO_TIME_OPTIONS = [15, 30, 45, 60] as const;
export type PulsoTimeOption = (typeof PULSO_TIME_OPTIONS)[number];

export const PULSO_ENERGY_LEVELS = ["low", "normal", "high"] as const;
export type PulsoEnergy = (typeof PULSO_ENERGY_LEVELS)[number];

export type PulsoPhaseSlug = "warmup" | "technique" | "repertoire" | "flexibility" | "vocalization";

export interface PulsoPhase {
  slug: PulsoPhaseSlug;
  categoryId: string;
  color: string;
  durationSeconds: number;
}

type PhaseWeights = Record<PulsoPhaseSlug, number>;

/** Cuánto del tiempo total se lleva cada fase según qué se quiera trabajar
 * — punto de partida antes de los ajustes de energía y progreso reciente
 * (ver `applyEnergyAdjustment`/`applyProgressBias` más abajo). Un peso a 0
 * hace que esa categoría no aparezca en el plan (se filtra más abajo por
 * quedar por debajo de `MIN_PHASE_SECONDS`) — así cada intención muestra un
 * conjunto de categorías distinto, no siempre las mismas tres con más o
 * menos tiempo. */
const INTENTION_WEIGHTS: Record<PulsoIntention, PhaseWeights> = {
  // Solo técnica: sin obras, con flexibilidad como parte del trabajo físico.
  technique: { warmup: 0.2, technique: 0.55, flexibility: 0.25, repertoire: 0, vocalization: 0 },
  // Calentamiento, vocalizaciones y flexibilidad — sin técnica ni obras;
  // flexibilidad es la que más peso se lleva de las tres.
  repertoire: { warmup: 0.25, technique: 0, flexibility: 0.45, repertoire: 0, vocalization: 0.3 },
  // Preparación cercana (concierto/examen): las cinco categorías, con más
  // peso en obras — el orden de presentación es el propio de este caso
  // (calentamiento, vocalizaciones, obras, flexibilidad, técnica), ver
  // INTENTION_PHASE_ORDER más abajo.
  prepare: { warmup: 0.1, technique: 0.2, flexibility: 0.1, repertoire: 0.45, vocalization: 0.15 },
  // Práctica concentrada y deliberada: calentamiento largo, técnica y
  // flexibilidad — sin obras, que piden un tipo de atención distinto.
  concentration: { warmup: 0.25, technique: 0.5, flexibility: 0.25, repertoire: 0, vocalization: 0 },
  // Sin una intención concreta (o una que el usuario ha escrito a mano):
  // calentamiento, técnica y obras repartidos de forma equilibrada.
  other: { warmup: 0.15, technique: 0.3, flexibility: 0.25, repertoire: 0.3, vocalization: 0 },
};

/** Orden en el que se presentan las fases de cada intención — no es solo el
 * peso, es el orden que tiene sentido seguir en la sesión (p. ej. calentar
 * antes de meterse con las obras). Una fase con peso 0 igualmente se filtra
 * más abajo por `MIN_PHASE_SECONDS`, así que no hace falta omitirla aquí.
 * Todas las intenciones usan el mismo orden salvo "preparar algo", que pidió
 * uno propio: calentamiento, vocalizaciones, obras, flexibilidad, técnica. */
const DEFAULT_PHASE_ORDER: PulsoPhaseSlug[] = [
  "warmup",
  "technique",
  "flexibility",
  "repertoire",
  "vocalization",
];
const INTENTION_PHASE_ORDER: Record<PulsoIntention, PulsoPhaseSlug[]> = {
  technique: DEFAULT_PHASE_ORDER,
  repertoire: DEFAULT_PHASE_ORDER,
  prepare: ["warmup", "vocalization", "repertoire", "flexibility", "technique"],
  concentration: DEFAULT_PHASE_ORDER,
  other: DEFAULT_PHASE_ORDER,
};

/** Con poca energía se resta exigencia técnica a favor de calentamiento y
 * repertorio (más cómodo); con mucha, al revés. "normal" no toca nada. La
 * flexibilidad y las vocalizaciones no se ven afectadas por la energía. */
const ENERGY_ADJUSTMENT: Record<PulsoEnergy, PhaseWeights> = {
  low: { warmup: 0.05, technique: -0.1, flexibility: 0, repertoire: 0.05, vocalization: 0 },
  normal: { warmup: 0, technique: 0, flexibility: 0, repertoire: 0, vocalization: 0 },
  high: { warmup: -0.05, technique: 0.05, flexibility: 0, repertoire: 0, vocalization: 0 },
};

/** Por debajo de esto una fase es demasiado corta para valer la pena como
 * bloque independiente (apenas da tiempo a nada) — su peso se reparte entre
 * el resto en vez de generar un bloque de, p. ej., 40 segundos. */
const MIN_PHASE_SECONDS = 180;

/** Cuánto peso como máximo se puede mover de técnica a repertorio (o al
 * revés) al usar el progreso reciente — un empujón, no un rediseño del
 * plan por muy desequilibrado que esté el historial. */
const MAX_PROGRESS_BIAS = 0.1;

function isSystemCategory(category: Category): category is SystemCategory {
  return category.kind === "system";
}

function applyEnergyAdjustment(weights: PhaseWeights, energy: PulsoEnergy): PhaseWeights {
  const adjustment = ENERGY_ADJUSTMENT[energy];
  return {
    warmup: Math.max(0, weights.warmup + adjustment.warmup),
    technique: Math.max(0, weights.technique + adjustment.technique),
    flexibility: Math.max(0, weights.flexibility + adjustment.flexibility),
    repertoire: Math.max(0, weights.repertoire + adjustment.repertoire),
    vocalization: Math.max(0, weights.vocalization + adjustment.vocalization),
  };
}

/** Si técnica y repertorio están descompensados en las últimas sesiones,
 * corrige el reparto de hoy hacia la que se ha practicado menos —
 * proporcional al desequilibrio, con un tope de `MAX_PROGRESS_BIAS`. */
function applyProgressBias(
  weights: PhaseWeights,
  recentMinutes: { technique: number; repertoire: number },
): PhaseWeights {
  const total = recentMinutes.technique + recentMinutes.repertoire;
  if (total === 0) return weights;
  const techniqueShare = recentMinutes.technique / total;
  const imbalance = techniqueShare - 0.5; // -0.5 (todo repertorio) .. 0.5 (toda técnica)
  const shift = Math.max(-MAX_PROGRESS_BIAS, Math.min(MAX_PROGRESS_BIAS, imbalance * 0.2));
  return {
    ...weights,
    technique: Math.max(0, weights.technique - shift),
    repertoire: Math.max(0, weights.repertoire + shift),
  };
}

export interface GeneratePulsoPlanOptions {
  energy?: PulsoEnergy;
  /** Minutos practicados recientemente en técnica/repertorio — solo se
   * aplica si el usuario ha pedido usar su progreso reciente; si se omite,
   * el reparto no se corrige por historial. */
  recentCategoryMinutes?: { technique: number; repertoire: number };
}

/**
 * Genera el plan de una sesión (fases con categoría y duración) a partir de
 * la intención elegida, el tiempo disponible y, opcionalmente, el nivel de
 * energía y el progreso reciente — la lógica detrás del flujo guiado de
 * Pulso. Devuelve `null` si faltan las categorías de sistema necesarias (no
 * debería pasar: se siembran en cada proyecto nuevo).
 */
export function generatePulsoPlan(
  intention: PulsoIntention,
  totalMinutes: number,
  categories: Category[],
  options: GeneratePulsoPlanOptions = {},
): PulsoPhase[] | null {
  const bySlug = new Map(categories.filter(isSystemCategory).map((c) => [c.slug, c]));
  const categoryBySlug: Partial<Record<PulsoPhaseSlug, SystemCategory>> = {
    warmup: bySlug.get("warmup"),
    technique: bySlug.get("technique"),
    repertoire: bySlug.get("repertoire"),
    flexibility: bySlug.get("flexibility"),
    vocalization: bySlug.get("vocalization"),
  };
  if (DEFAULT_PHASE_ORDER.some((slug) => !categoryBySlug[slug])) return null;

  const totalSeconds = Math.round(totalMinutes * 60);

  let weights = INTENTION_WEIGHTS[intention];
  weights = applyEnergyAdjustment(weights, options.energy ?? "normal");
  if (options.recentCategoryMinutes) weights = applyProgressBias(weights, options.recentCategoryMinutes);

  let candidates: { slug: PulsoPhaseSlug; category: SystemCategory; weight: number }[] =
    INTENTION_PHASE_ORDER[intention].map((slug) => ({
      slug,
      category: categoryBySlug[slug]!,
      weight: weights[slug],
    }));

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
