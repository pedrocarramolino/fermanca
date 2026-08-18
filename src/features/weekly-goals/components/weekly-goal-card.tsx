"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDurationShort } from "@/core/domain/duration";
import { saveWeeklyGoal, setWeeklyGoalCompleted } from "@/features/weekly-goals/application/actions";
import type { WeeklyGoal, WeeklyGoalProgress } from "@/core/domain/weekly-goal";

const DEFAULT_TARGET_DAYS = 5;
const DEFAULT_TARGET_HOURS = 10;

export function WeeklyGoalCard({
  initialGoal,
  progress,
}: {
  initialGoal: WeeklyGoal | null;
  progress: WeeklyGoalProgress | null;
}) {
  const t = useTranslations("WeeklyGoal");
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(!initialGoal);
  const [days, setDays] = useState(initialGoal?.targetDays ?? DEFAULT_TARGET_DAYS);
  const [hours, setHours] = useState(
    initialGoal ? initialGoal.targetSeconds / 3600 : DEFAULT_TARGET_HOURS,
  );
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleSave() {
    setSaveError(null);
    startTransition(async () => {
      try {
        const saved = await saveWeeklyGoal(days, hours);
        setGoal(saved);
        setEditing(false);
        router.refresh();
      } catch {
        setSaveError(t("form.saveError"));
      }
    });
  }

  function handleMarkCompleted() {
    if (!goal) return;
    startTransition(async () => {
      const updated = await setWeeklyGoalCompleted(goal.id, true);
      setGoal(updated);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-1.5 text-base">
            <Target className="size-4" aria-hidden />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="goal-days">{t("form.days")}</Label>
              <Input
                id="goal-days"
                type="number"
                min={1}
                max={7}
                value={days}
                onChange={(event) =>
                  setDays(Math.min(7, Math.max(1, Number(event.target.value) || 1)))
                }
              />
              <span className="text-muted-foreground text-xs">{t("form.daysHint")}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="goal-hours">{t("form.hours")}</Label>
              <Input
                id="goal-hours"
                type="number"
                min={0.5}
                step={0.5}
                value={hours}
                onChange={(event) => setHours(Math.max(0.5, Number(event.target.value) || 0.5))}
              />
              <span className="text-muted-foreground text-xs">{t("form.hoursHint")}</span>
            </div>
          </div>
          {saveError && <p className="text-destructive text-sm">{saveError}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? t("form.saving") : t("form.save")}
            </Button>
            {goal && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                {t("form.cancel")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!goal || !progress) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center justify-between text-base">
          <span className="flex items-center gap-1.5">
            <Target className="size-4" aria-hidden />
            {t("title")}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t("hoursLabel")}</span>
            <span className="font-medium">
              {formatDurationShort(progress.practicedSeconds)} /{" "}
              {formatDurationShort(goal.targetSeconds)}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${progress.secondsPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t("daysLabel")}</span>
            <span className="font-medium">
              {t("daysProgress", { practiced: progress.practicedDays, target: goal.targetDays })}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: goal.targetDays }, (_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < progress.practicedDays ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {goal.completed ? (
          <div className="text-primary flex items-center gap-1.5 text-sm font-medium">
            <CheckCircle2 className="size-4" aria-hidden />
            {t("completed")}
          </div>
        ) : (
          progress.reached && (
            <Button type="button" size="sm" onClick={handleMarkCompleted} disabled={isPending}>
              <CheckCircle2 className="size-4" aria-hidden />
              {t("markCompleted")}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
