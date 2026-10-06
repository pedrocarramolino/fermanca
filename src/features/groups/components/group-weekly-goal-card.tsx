"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationShort } from "@/core/domain/duration";
import { parseWeeklyGoalHours } from "@/core/domain/weekly-goal";
import {
  GoalTargetFields,
  hoursToText,
} from "@/features/weekly-goals/components/goal-target-fields";
import {
  markGroupWeeklyGoalCompleted,
  sendTestGroupWeeklyGoalPush,
  setGroupWeeklyGoal,
  type GroupWeeklyGoalInfo,
} from "@/features/groups/application/actions";

const DEFAULT_TARGET_DAYS = 5;
const DEFAULT_TARGET_HOURS = 10;

export function GroupWeeklyGoalCard({
  groupId,
  isOwner,
  initialGoal,
}: {
  groupId: string;
  isOwner: boolean;
  initialGoal: GroupWeeklyGoalInfo | null;
}) {
  const t = useTranslations("Groups.weeklyGoal");
  const router = useRouter();
  const [editing, setEditing] = useState(isOwner && !initialGoal);
  const [days, setDays] = useState(initialGoal?.targetDays ?? DEFAULT_TARGET_DAYS);
  const locale = useLocale();
  const [hoursText, setHoursText] = useState(() =>
    hoursToText(initialGoal ? initialGoal.targetSeconds / 3600 : DEFAULT_TARGET_HOURS, locale),
  );
  const hours = parseWeeklyGoalHours(hoursText);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isTesting, startTesting] = useTransition();
  const [testResult, setTestResult] = useState<"sent" | "error" | null>(null);

  function handleSave() {
    if (hours === null) return;
    setError(null);
    startTransition(async () => {
      try {
        await setGroupWeeklyGoal(groupId, days, hours);
        setEditing(false);
        router.refresh();
      } catch {
        setError(t("saveError"));
      }
    });
  }

  function handleMarkCompleted() {
    if (!initialGoal) return;
    startTransition(async () => {
      await markGroupWeeklyGoalCompleted(groupId, initialGoal.id);
      router.refresh();
    });
  }

  function handleTest() {
    setTestResult(null);
    startTesting(async () => {
      try {
        await sendTestGroupWeeklyGoalPush(groupId);
        setTestResult("sent");
      } catch {
        setTestResult("error");
      }
      setTimeout(() => setTestResult(null), 4000);
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
          <GoalTargetFields
            idPrefix="group-goal"
            days={days}
            onDaysChange={setDays}
            hoursText={hoursText}
            onHoursTextChange={setHoursText}
            daysLabel={t("days")}
            hoursLabel={t("hours")}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} disabled={isPending || hours === null}>
              {isPending ? t("saving") : t("save")}
            </Button>
            {initialGoal && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!initialGoal) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-4 text-center text-sm">
          {t("none")}
        </CardContent>
      </Card>
    );
  }

  const { myProgress, myCompletion } = initialGoal;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center justify-between text-base">
          <span className="flex items-center gap-1.5">
            <Target className="size-4" aria-hidden />
            {t("title")}
          </span>
          <span className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("test")}
              disabled={isTesting}
              onClick={handleTest}
            >
              <Bell className="size-4" />
            </Button>
            {isOwner && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
                {t("edit")}
              </Button>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {testResult && (
          <p className={testResult === "error" ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
            {testResult === "sent" ? t("testSent") : t("testError")}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t("hoursLabel")}</span>
            <span className="font-medium">
              {formatDurationShort(myProgress.practicedSeconds)} /{" "}
              {formatDurationShort(initialGoal.targetSeconds)}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${myProgress.secondsPercentage}%` }}
            />
          </div>
        </div>

        {myCompletion ? (
          <div className="text-primary flex items-center gap-1.5 text-sm font-medium">
            <CheckCircle2 className="size-4" aria-hidden />
            {t("completed")}
          </div>
        ) : (
          myProgress.reached && (
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
