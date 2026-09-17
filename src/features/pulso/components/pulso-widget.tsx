"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Battery,
  BatteryFull,
  BatteryLow,
  Brain,
  Lightbulb,
  Minus,
  Music,
  Plus,
  Shuffle,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDurationShort } from "@/core/domain/duration";
import type { Category } from "@/core/domain/category";
import { startSession } from "@/features/session-builder/application/actions";
import { PulsoOrb } from "@/features/pulso/components/pulso-orb";
import type { PulsoSignals } from "@/features/pulso/application/signals";
import {
  generatePulsoPlan,
  PULSO_ENERGY_LEVELS,
  PULSO_INTENTIONS,
  PULSO_TIME_OPTIONS,
  type PulsoEnergy,
  type PulsoIntention,
  type PulsoPhase,
  type PulsoTimeOption,
} from "@/features/pulso/application/generate-plan";

type Step = "intention" | "time" | "context" | "preview";

const INTENTION_ICONS: Record<PulsoIntention, typeof Target> = {
  technique: Target,
  repertoire: Music,
  prepare: Sparkles,
  concentration: Brain,
  other: Shuffle,
};

const ENERGY_ICONS: Record<PulsoEnergy, typeof Battery> = {
  low: BatteryLow,
  normal: Battery,
  high: BatteryFull,
};

/** Racha (días) a partir de la cual el brillo de la luciérnaga llega a su
 * máximo — a partir de ahí ya no crece más. */
const STREAK_FOR_FULL_GLOW = 14;
/** Sin práctica reciente durante al menos esto, el saludo cambia a uno que
 * invita a retomar en vez de preguntar "qué trabajamos" sin más contexto. */
const REENGAGEMENT_DAYS = 3;
/** Cuánto se acorta/alarga el plan con "Más corta"/"Más intensa". */
const ADJUST_FACTOR = { shorter: 0.7, longer: 1.3 } as const;
const MIN_TOTAL_MINUTES = 10;
const MAX_TOTAL_MINUTES = 120;
const MIN_PHASE_MINUTES = 1;
const PHASE_STEP_SECONDS = 300;

function stepBack(current: Step): Step {
  if (current === "time") return "intention";
  if (current === "context") return "time";
  if (current === "preview") return "context";
  return "intention";
}

interface Suggestion {
  text: string;
  apply: () => void;
}

/**
 * Mascota flotante en Inicio: al tocarla, un flujo corto y guiado (qué
 * quieres trabajar, cuánto tiempo, energía/contexto) genera un plan de
 * sesión completo -reparto de fases y duración ya calculado, ver
 * generatePulsoPlan- que se puede ajustar antes de desembocar directamente
 * en "Iniciar sesión". Cuando las señales de uso lo justifican (objetivo
 * semanal pendiente, varias sesiones seguidas en la misma categoría, unos
 * días sin practicar) ofrece un atajo de un toque en vez de las preguntas
 * completas — pero nunca las sustituye del todo. Es un acceso rápido
 * alternativo, no sustituye a SessionBuilder ni es el centro de la app.
 */
export function PulsoWidget({
  categories,
  signals,
}: {
  categories: Category[];
  signals: PulsoSignals;
}) {
  const t = useTranslations("Pulso");
  const tCategories = useTranslations("Categories");
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("intention");
  const [intention, setIntention] = useState<PulsoIntention | null>(null);
  const [otherLabel, setOtherLabel] = useState("");
  const [minutes, setMinutes] = useState<number | null>(null);
  const [energy, setEnergy] = useState<PulsoEnergy>("normal");
  const [focusNote, setFocusNote] = useState("");
  const [useProgress, setUseProgress] = useState(false);
  const [phases, setPhases] = useState<PulsoPhase[] | null>(null);
  const [isStarting, startStarting] = useTransition();

  const hasRecentProgressData =
    signals.recentCategoryMinutes.technique + signals.recentCategoryMinutes.repertoire > 0;
  const reengaging =
    signals.daysSinceLastPractice !== null && signals.daysSinceLastPractice >= REENGAGEMENT_DAYS;
  const glowIntensity = Math.min(signals.currentStreak / STREAK_FOR_FULL_GLOW, 1);

  function reset() {
    setStep("intention");
    setIntention(null);
    setOtherLabel("");
    setMinutes(null);
    setEnergy("normal");
    setFocusNote("");
    setUseProgress(false);
    setPhases(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function generate(
    nextIntention: PulsoIntention,
    nextMinutes: number,
    nextEnergy: PulsoEnergy,
    nextUseProgress: boolean,
  ) {
    setPhases(
      generatePulsoPlan(nextIntention, nextMinutes, categories, {
        energy: nextEnergy,
        recentCategoryMinutes: nextUseProgress ? signals.recentCategoryMinutes : undefined,
      }),
    );
    setStep("preview");
  }

  function handlePickIntention(value: PulsoIntention) {
    setIntention(value);
    if (value === "other") return; // espera el texto antes de avanzar
    setStep("time");
  }

  function handlePickTime(value: PulsoTimeOption) {
    setMinutes(value);
    setStep("context");
  }

  function handleConfirmContext() {
    if (!intention || minutes === null) return;
    generate(intention, minutes, energy, useProgress);
  }

  function applySuggestion(nextIntention: PulsoIntention, nextMinutes: number) {
    setIntention(nextIntention);
    setMinutes(nextMinutes);
    setEnergy("normal");
    setUseProgress(false);
    generate(nextIntention, nextMinutes, "normal", false);
  }

  function suggestion(): Suggestion | null {
    if (signals.dominantRecentCategory) {
      const neglected = signals.dominantRecentCategory === "technique" ? "repertoire" : "technique";
      return {
        text: t("suggestions.dominantCategory", {
          category: t(`intention.${signals.dominantRecentCategory}.title`),
          other: t(`intention.${neglected}.title`),
        }),
        apply: () => applySuggestion(neglected, 30),
      };
    }
    if (reengaging) {
      return {
        text: t("suggestions.reengagement"),
        apply: () => applySuggestion("repertoire", 15),
      };
    }
    return null;
  }

  function phaseName(phase: PulsoPhase): string {
    return tCategories(phase.slug);
  }

  function adjustPhaseSeconds(index: number, deltaSeconds: number) {
    setPhases((prev) =>
      prev
        ? prev.map((phase, i) =>
            i === index
              ? {
                  ...phase,
                  durationSeconds: Math.max(
                    MIN_PHASE_MINUTES * 60,
                    phase.durationSeconds + deltaSeconds,
                  ),
                }
              : phase,
          )
        : prev,
    );
  }

  function adjustTotal(factor: number) {
    if (!intention || !phases) return;
    const currentTotal = phases.reduce((sum, p) => sum + p.durationSeconds, 0) / 60;
    const nextTotal = Math.max(
      MIN_TOTAL_MINUTES,
      Math.min(MAX_TOTAL_MINUTES, Math.round((currentTotal * factor) / 5) * 5),
    );
    generate(intention, nextTotal, energy, useProgress);
  }

  function handleStart() {
    if (!phases) return;
    const blocks = phases.map((phase, position) => ({
      categoryId: phase.categoryId,
      name: phaseName(phase),
      durationSeconds: phase.durationSeconds,
      color: phase.color,
      position,
    }));
    startStarting(async () => {
      await startSession(null, blocks);
    });
  }

  const totalSeconds = phases?.reduce((sum, phase) => sum + phase.durationSeconds, 0) ?? 0;
  const activeSuggestion = step === "intention" ? suggestion() : null;

  return (
    <>
      <button
        type="button"
        aria-label={t("trigger")}
        onClick={() => setOpen(true)}
        className="focus-visible:ring-ring/50 fixed right-4 z-30 rounded-full focus-visible:ring-3 focus-visible:outline-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 6.5rem)" }}
      >
        <PulsoOrb intensity={glowIntensity} reduceMotion={!!reduceMotion} />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          {step !== "intention" && (
            <button
              type="button"
              aria-label={t("back")}
              onClick={() => setStep(stepBack(step))}
              className="text-muted-foreground hover:text-foreground absolute top-2 left-2 flex size-8 items-center justify-center rounded-full"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}

          {step === "intention" && (
            <>
              <DialogHeader className="items-center pt-4 text-center">
                <PulsoOrb intensity={glowIntensity} reduceMotion={!!reduceMotion} className="mb-1 size-12" />
                <DialogTitle>{reengaging ? t("reengagementTitle") : t("intentionTitle")}</DialogTitle>
                <DialogDescription>
                  {reengaging ? t("reengagementDescription") : t("intentionDescription")}
                </DialogDescription>
              </DialogHeader>

              {activeSuggestion && (
                <button
                  type="button"
                  onClick={activeSuggestion.apply}
                  className="border-primary/30 bg-primary/5 hover:bg-primary/10 flex items-start gap-2 rounded-lg border p-3 text-left"
                >
                  <Lightbulb className="text-primary mt-0.5 size-4 shrink-0" />
                  <span className="text-sm">{activeSuggestion.text}</span>
                </button>
              )}

              <div className="flex flex-col gap-2">
                {PULSO_INTENTIONS.map((value) => {
                  const Icon = INTENTION_ICONS[value];
                  const selected = intention === value;
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="h-auto justify-start gap-3 py-3"
                      onClick={() => handlePickIntention(value)}
                    >
                      <Icon
                        className={cn("size-5 shrink-0", selected ? "text-primary-foreground" : "text-primary")}
                      />
                      <span className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{t(`intention.${value}.title`)}</span>
                        <span
                          className={cn(
                            "text-xs font-normal text-wrap",
                            selected ? "text-primary-foreground/80" : "text-muted-foreground",
                          )}
                        >
                          {t(`intention.${value}.description`)}
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>

              {intention === "other" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pulso-other-label">{t("otherLabel")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pulso-other-label"
                      value={otherLabel}
                      onChange={(event) => setOtherLabel(event.target.value)}
                      placeholder={t("otherPlaceholder")}
                      className="flex-1"
                    />
                    <Button type="button" onClick={() => setStep("time")}>
                      {t("continue")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === "time" && (
            <>
              <DialogHeader className="pt-4 text-center">
                <DialogTitle>{t("timeTitle")}</DialogTitle>
                <DialogDescription>{t("timeDescription")}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                {PULSO_TIME_OPTIONS.map((value, index) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    className="h-auto flex-col gap-1 py-4"
                    onClick={() => handlePickTime(value)}
                  >
                    <span className="font-medium">
                      {index === PULSO_TIME_OPTIONS.length - 1 ? `${value}+` : value} min
                    </span>
                  </Button>
                ))}
              </div>
            </>
          )}

          {step === "context" && (
            <>
              <DialogHeader className="pt-4 text-center">
                <DialogTitle>{t("contextTitle")}</DialogTitle>
                <DialogDescription>{t("contextDescription")}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2">
                <Label>{t("energyLabel")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PULSO_ENERGY_LEVELS.map((level) => {
                    const Icon = ENERGY_ICONS[level];
                    return (
                      <Button
                        key={level}
                        type="button"
                        variant={energy === level ? "default" : "outline"}
                        className="h-auto flex-col gap-1 py-3"
                        onClick={() => setEnergy(level)}
                      >
                        <Icon className="size-4" />
                        <span className="text-xs">{t(`energy.${level}`)}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pulso-focus-note">{t("focusLabel")}</Label>
                <Input
                  id="pulso-focus-note"
                  value={focusNote}
                  onChange={(event) => setFocusNote(event.target.value)}
                  placeholder={t("focusPlaceholder")}
                />
              </div>

              {hasRecentProgressData && (
                <label
                  htmlFor="pulso-use-progress"
                  className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{t("useProgressLabel")}</span>
                    <span className="text-muted-foreground text-xs">{t("useProgressDescription")}</span>
                  </span>
                  <Switch id="pulso-use-progress" checked={useProgress} onCheckedChange={setUseProgress} />
                </label>
              )}

              <DialogFooter>
                <Button type="button" onClick={handleConfirmContext}>
                  {t("prepareSession")}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "preview" && (
            <>
              <DialogHeader className="pt-4">
                <DialogTitle>{t("previewTitle")}</DialogTitle>
                <DialogDescription>
                  {phases
                    ? t("previewDescription", { duration: formatDurationShort(totalSeconds) })
                    : t("previewError")}
                </DialogDescription>
              </DialogHeader>

              {phases && intention && (
                <>
                  <p className="text-muted-foreground text-sm">
                    {t(`rationale.${intention}`)}
                    {energy !== "normal" && ` ${t(`rationale.energy.${energy}`)}`}
                  </p>
                  {useProgress && hasRecentProgressData && (
                    <p className="text-muted-foreground text-xs">{t("rationale.progress")}</p>
                  )}
                  {intention === "other" && otherLabel && (
                    <p className="text-muted-foreground text-xs">
                      {t("rationale.otherFocus", { label: otherLabel })}
                    </p>
                  )}
                  {focusNote && (
                    <p className="text-muted-foreground text-xs">
                      {t("rationale.focusNote", { note: focusNote })}
                    </p>
                  )}

                  <ul className="flex flex-col gap-2">
                    {phases.map((phase, index) => (
                      <li
                        key={phase.slug}
                        className="border-border flex items-center gap-2 rounded-lg border p-2.5"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: phase.color }}
                          aria-hidden
                        />
                        <span className="flex-1 text-sm font-medium">{phaseName(phase)}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t("decreaseDuration", { name: phaseName(phase) })}
                            onClick={() => adjustPhaseSeconds(index, -PHASE_STEP_SECONDS)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="text-muted-foreground w-14 text-center text-xs">
                            {formatDurationShort(phase.durationSeconds)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t("increaseDuration", { name: phaseName(phase) })}
                            onClick={() => adjustPhaseSeconds(index, PHASE_STEP_SECONDS)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => adjustTotal(ADJUST_FACTOR.shorter)}
                    >
                      {t("shorter")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => adjustTotal(ADJUST_FACTOR.longer)}
                    >
                      {t("longer")}
                    </Button>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button type="button" disabled={!phases || isStarting} onClick={handleStart}>
                  {isStarting ? t("starting") : t("start")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
