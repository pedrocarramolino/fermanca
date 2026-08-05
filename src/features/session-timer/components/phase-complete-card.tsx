"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

export function PhaseCompleteCard({
  completedBlock,
  nextBlock,
  onConfirm,
  onAddTime,
}: {
  completedBlock: RuntimeBlockInput;
  nextBlock: RuntimeBlockInput | null;
  onConfirm: () => void;
  onAddTime: (seconds: number) => void;
}) {
  const t = useTranslations("PhaseComplete");

  return (
    <div
      role="status"
      aria-live="polite"
      className="motion-safe:animate-in motion-safe:fade-in-0 flex flex-col items-center gap-6 text-center motion-safe:duration-200"
    >
      <p className="text-muted-foreground text-sm">{t("completed", { name: completedBlock.name })}</p>

      {nextBlock ? (
        <div className="flex flex-col items-center gap-2">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: nextBlock.color }}
            aria-hidden
          />
          <p className="text-muted-foreground text-sm">{t("next")}</p>
          <p className="text-2xl font-semibold">{nextBlock.name}</p>
        </div>
      ) : (
        <p className="text-2xl font-semibold">{t("lastPhaseCompleted")}</p>
      )}

      <Button type="button" size="lg" onClick={onConfirm}>
        {nextBlock ? t("nextPhase") : t("finishSession")}
      </Button>

      <div className="flex flex-col items-center gap-2">
        <p className="text-muted-foreground text-xs">
          {t("addTimeQuestion", { name: completedBlock.name })}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onAddTime(300)}>
            +5 min
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAddTime(600)}>
            +10 min
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAddTime(900)}>
            +15 min
          </Button>
        </div>
      </div>
    </div>
  );
}
