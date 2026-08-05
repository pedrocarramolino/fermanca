"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteReminder, setReminderEnabled } from "@/features/reminders/application/actions";
import type { DayOfWeek, Reminder } from "@/core/domain/reminder";

const DAY_KEYS: Record<DayOfWeek, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};
const ORDERED_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export function ReminderList({
  reminders,
  onDeleted,
  onToggled,
}: {
  reminders: Reminder[];
  onDeleted: (id: string) => void;
  onToggled: (id: string, enabled: boolean) => void;
}) {
  const t = useTranslations("Reminders");
  const [isPending, startTransition] = useTransition();

  if (reminders.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("list.empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {reminders.map((reminder) => (
        <li
          key={reminder.id}
          className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg tabular-nums">{reminder.timeOfDay}</span>
            <div className="flex gap-1">
              {ORDERED_DAYS.map((day) => (
                <span
                  key={day}
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                    reminder.daysOfWeek.includes(day)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t(`day.${DAY_KEYS[day]}`)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={reminder.enabled}
              disabled={isPending}
              onCheckedChange={(checked: boolean) => {
                onToggled(reminder.id, checked);
                startTransition(() => setReminderEnabled(reminder.id, checked));
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("list.delete")}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteReminder(reminder.id);
                  onDeleted(reminder.id);
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
