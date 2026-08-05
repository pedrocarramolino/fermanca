"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ReminderForm } from "@/features/reminders/components/reminder-form";
import { ReminderList } from "@/features/reminders/components/reminder-list";
import type { Reminder } from "@/core/domain/reminder";

export function RemindersManager({ initialReminders }: { initialReminders: Reminder[] }) {
  const t = useTranslations("Reminders");
  const [reminders, setReminders] = useState(initialReminders);

  return (
    <div className="flex flex-col gap-4">
      <ReminderForm onCreated={(reminder) => setReminders((prev) => [...prev, reminder])} />
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-semibold">{t("yourReminders")}</h2>
        <ReminderList
          reminders={reminders}
          onDeleted={(id) => setReminders((prev) => prev.filter((r) => r.id !== id))}
          onToggled={(id, enabled) =>
            setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)))
          }
        />
      </div>
    </div>
  );
}
