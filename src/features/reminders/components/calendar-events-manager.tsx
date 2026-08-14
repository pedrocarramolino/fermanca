"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarEventForm } from "@/features/reminders/components/calendar-event-form";
import { CalendarEventList } from "@/features/reminders/components/calendar-event-list";
import { CalendarEventDialog } from "@/features/reminders/components/calendar-event-dialog";
import { daysUntil } from "@/core/domain/calendar-event";
import type { CalendarEvent } from "@/core/domain/calendar-event";

function byDateAscending(a: CalendarEvent, b: CalendarEvent) {
  return daysUntil(a.date, new Date()) - daysUntil(b.date, new Date());
}

export function CalendarEventsManager({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const t = useTranslations("CalendarEvents");
  const [events, setEvents] = useState(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  function handleCreated(event: CalendarEvent) {
    // Se reinserta ordenado por fecha (más próxima primero) en vez de
    // añadirlo al final — igual que la lista que ya trae el servidor
    // ordenada, así no hace falta recargar para verlo en su sitio.
    setEvents((prev) => [...prev, event].sort(byDateAscending));
  }

  function handleUpdated(event: CalendarEvent) {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)).sort(byDateAscending));
  }

  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <CalendarEventForm onCreated={handleCreated} />
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-semibold">{t("yourEvents")}</h2>
        <CalendarEventList events={events} onSelect={setSelectedEvent} onDeleted={handleDeleted} />
      </div>

      <CalendarEventDialog
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
