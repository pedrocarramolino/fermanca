"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseWeeklyGoalHours } from "@/core/domain/weekly-goal";

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

/** Días y horas de un objetivo semanal (personal o de grupo).
 *
 * Los días son botones: antes eran un número que se corregía en cada
 * pulsación, y al borrar "5" para escribir "3" el campo se volvía "1" y
 * acababa en "13" → 7. Las horas se guardan como texto tal cual se escriben
 * y solo se interpretan al guardar, por lo mismo ("0.5" + "3" = "0.53"). */
export function GoalTargetFields({
  idPrefix,
  days,
  onDaysChange,
  hoursText,
  onHoursTextChange,
  daysLabel,
  hoursLabel,
}: {
  idPrefix: string;
  days: number;
  onDaysChange: (days: number) => void;
  hoursText: string;
  onHoursTextChange: (text: string) => void;
  daysLabel: string;
  hoursLabel: string;
}) {
  const t = useTranslations("WeeklyGoal.form");
  const hoursInvalid = hoursText.trim() !== "" && parseWeeklyGoalHours(hoursText) === null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label id={`${idPrefix}-days-label`}>{daysLabel}</Label>
        <div role="group" aria-labelledby={`${idPrefix}-days-label`} className="flex gap-1">
          {DAY_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              onClick={() => onDaysChange(value)}
              className="border-border data-[selected]:border-primary data-[selected]:bg-primary data-[selected]:text-primary-foreground focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-full border text-sm tabular-nums focus-visible:ring-3 focus-visible:outline-none"
              data-selected={days === value || undefined}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-hours`}>{hoursLabel}</Label>
        <Input
          id={`${idPrefix}-hours`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="w-32"
          value={hoursText}
          aria-invalid={hoursInvalid || undefined}
          aria-describedby={`${idPrefix}-hours-hint`}
          onChange={(event) => onHoursTextChange(event.target.value)}
        />
        <span
          id={`${idPrefix}-hours-hint`}
          className={hoursInvalid ? "text-destructive text-xs" : "text-muted-foreground text-xs"}
        >
          {hoursInvalid ? t("hoursInvalid") : t("hoursHint")}
        </span>
      </div>
    </div>
  );
}

/** Horas guardadas → texto del campo, con la coma decimal si toca. */
export function hoursToText(hours: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(
    hours,
  );
}
