"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReminder } from "@/features/reminders/application/actions";
import type { DayOfWeek, Reminder } from "@/core/domain/reminder";

const DAY_LABELS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

export function ReminderForm({ onCreated }: { onCreated: (reminder: Reminder) => void }) {
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
    <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reminder-time">Hora</Label>
        <Input
          id="reminder-time"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Días</Label>
        <div className="flex gap-1">
          {DAY_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={days.includes(value)}
              onClick={() => toggleDay(value)}
              className="border-border data-[selected]:border-primary data-[selected]:bg-primary data-[selected]:text-primary-foreground flex size-8 items-center justify-center rounded-full border text-sm"
              data-selected={days.includes(value) || undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Button type="button" onClick={handleCreate} disabled={isPending || days.length === 0}>
        {isPending ? "Añadiendo…" : "Añadir recordatorio"}
      </Button>
    </div>
  );
}
