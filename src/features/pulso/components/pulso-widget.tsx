"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, Clock, Music, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  generatePulsoPlan,
  PULSO_INTENTIONS,
  PULSO_TIME_OPTIONS,
  type PulsoIntention,
  type PulsoPhase,
  type PulsoTimeOption,
} from "@/features/pulso/application/generate-plan";

type Step = "intention" | "time" | "preview";

const INTENTION_ICONS: Record<PulsoIntention, typeof Target> = {
  technique: Target,
  repertoire: Music,
  prepare: Sparkles,
};

/**
 * Mascota flotante en Inicio: al tocarla, dos preguntas rápidas (qué se
 * quiere trabajar + cuánto tiempo hay) generan un plan de sesión completo
 * -reparto de fases y duración ya calculado, ver generatePulsoPlan- que
 * desemboca directamente en "Iniciar sesión", sin pasar por el constructor
 * manual. Es un atajo alternativo, no sustituye a SessionBuilder.
 */
export function PulsoWidget({ categories }: { categories: Category[] }) {
  const t = useTranslations("Pulso");
  const tCategories = useTranslations("Categories");
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("intention");
  const [intention, setIntention] = useState<PulsoIntention | null>(null);
  const [phases, setPhases] = useState<PulsoPhase[] | null>(null);
  const [isStarting, startStarting] = useTransition();

  function reset() {
    setStep("intention");
    setIntention(null);
    setPhases(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handlePickIntention(value: PulsoIntention) {
    setIntention(value);
    setStep("time");
  }

  function handlePickTime(value: PulsoTimeOption) {
    if (!intention) return;
    setPhases(generatePulsoPlan(intention, value, categories));
    setStep("preview");
  }

  function phaseName(phase: PulsoPhase): string {
    return phase.slug === "closing" ? t("phase.closing") : tCategories(phase.slug);
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

  return (
    <>
      <button
        type="button"
        aria-label={t("trigger")}
        onClick={() => setOpen(true)}
        className="focus-visible:ring-ring/50 fixed right-4 z-30 rounded-full focus-visible:ring-3 focus-visible:outline-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 6.5rem)" }}
      >
        <PulsoOrb reduceMotion={!!reduceMotion} />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          {step !== "intention" && (
            <button
              type="button"
              aria-label={t("back")}
              onClick={() => setStep(step === "preview" ? "time" : "intention")}
              className="text-muted-foreground hover:text-foreground absolute top-2 left-2 flex size-8 items-center justify-center rounded-full"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}

          {step === "intention" && (
            <>
              <DialogHeader className="items-center pt-4 text-center">
                <PulsoOrb reduceMotion={!!reduceMotion} className="mb-1 size-12" />
                <DialogTitle>{t("intentionTitle")}</DialogTitle>
                <DialogDescription>{t("intentionDescription")}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                {PULSO_INTENTIONS.map((value) => {
                  const Icon = INTENTION_ICONS[value];
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start gap-3 py-3"
                      onClick={() => handlePickIntention(value)}
                    >
                      <Icon className="text-primary size-5 shrink-0" />
                      <span className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{t(`intention.${value}.title`)}</span>
                        <span className="text-muted-foreground text-xs font-normal text-wrap">
                          {t(`intention.${value}.description`)}
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>
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
                    <Clock className="text-primary size-5" />
                    <span className="font-medium">
                      {index === PULSO_TIME_OPTIONS.length - 1 ? `${value}+` : value} min
                    </span>
                  </Button>
                ))}
              </div>
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
              {phases && (
                <ul className="flex flex-col gap-2">
                  {phases.map((phase) => (
                    <li
                      key={phase.slug}
                      className="border-border flex items-center gap-3 rounded-lg border p-3"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: phase.color }}
                        aria-hidden
                      />
                      <span className="flex-1 text-sm font-medium">{phaseName(phase)}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatDurationShort(phase.durationSeconds)}
                      </span>
                    </li>
                  ))}
                </ul>
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
