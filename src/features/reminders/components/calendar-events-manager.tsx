"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarEventForm } from "@/features/reminders/components/calendar-event-form";
import { CalendarEventList } from "@/features/reminders/components/calendar-event-list";
import { daysUntil } from "@/core/domain/calendar-event";
import type { CalendarEvent } from "@/core/domain/calendar-event";

export function CalendarEventsManager({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const t = useTranslations("CalendarEvents");
  const [events, setEvents] = useState(initialEvents);

  function handleCreated(event: CalendarEvent) {
    // Se reinserta ordenado por fecha (más próxima primero) en vez de
    // añadirlo al final — igual que la lista que ya trae el servidor
    // ordenada, así no hace falta recargar para verlo en su sitio.
    setEvents((prev) =>
      [...prev, event].sort((a, b) => daysUntil(a.date, new Date()) - daysUntil(b.date, new Date())),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CalendarEventForm onCreated={handleCreated} />
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-semibold">{t("yourEvents")}</h2>
        <CalendarEventList
          events={events}
          onDeleted={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
        />
      </div>
    </div>
  );
}
