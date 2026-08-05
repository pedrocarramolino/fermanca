"use client";

import { useTranslations } from "next-intl";
import { formatDurationClock } from "@/core/domain/duration";

export function TimerDisplay({
  blockName,
  color,
  remainingSeconds,
  nextBlockName,
  isPaused,
}: {
  blockName: string;
  color: string;
  remainingSeconds: number;
  nextBlockName: string | null;
  isPaused?: boolean;
}) {
  const t = useTranslations("TimerDisplay");

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-2">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="text-lg font-medium">{blockName}</span>
      </div>

      <span className="font-mono text-7xl font-semibold tabular-nums" aria-live="off">
        {formatDurationClock(Math.ceil(remainingSeconds))}
      </span>

      <p className="text-muted-foreground min-h-5 text-sm">
        {isPaused
          ? t("paused")
          : nextBlockName
            ? t("next", { name: nextBlockName })
            : t("lastBlock")}
      </p>
    </div>
  );
}
