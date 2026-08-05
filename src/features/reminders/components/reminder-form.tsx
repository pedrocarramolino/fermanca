"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReminder } from "@/features/reminders/application/actions";
import type { DayOfWeek, Reminder } from "@/core/domain/reminder";

const DAY_ORDER: { value: DayOfWeek; key: string }[] = [
  { value: 1, key: "mon" },
  { value: 2, key: "tue" },
  { value: 3, key: "wed" },
  { value: 4, key: "thu" },
  { value: 5, key: "fri" },
  { value: 6, key: "sat" },
  { value: 0, key: "sun" },
];

export function ReminderForm({ onCreated }: { onCreated: (reminder: Reminder) => void }) {
  const t = useTranslations("Reminders");
  const [time, setTime] = useState("18:00");
  const [days, setDays] = useState<DayOfWeek[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isPending, startTransition] = useTransition();

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function handleCreate() {
    if (days.length === 0) return;
    startTransition(async () => {
      const reminder = await createReminder(time, days);
      onCreated(reminder);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("form.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="reminder-time">{t("form.time")}</Label>
          <Input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-32"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("form.days")}</Label>
          <div className="flex gap-1">
            {DAY_ORDER.map(({ value, key }) => (
              <button
                key={value}
                type="button"
                aria-pressed={days.includes(value)}
                onClick={() => toggleDay(value)}
                className="border-border data-[selected]:border-primary data-[selected]:bg-primary data-[selected]:text-primary-foreground flex size-8 items-center justify-center rounded-full border text-sm"
                data-selected={days.includes(value) || undefined}
              >
                {t(`day.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <Button type="button" onClick={handleCreate} disabled={isPending || days.length === 0}>
          {isPending ? t("form.adding") : t("form.add")}
        </Button>
      </CardContent>
    </Card>
  );
}
