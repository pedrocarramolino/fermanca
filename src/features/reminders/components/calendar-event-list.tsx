"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { daysUntil } from "@/core/domain/calendar-event";
import { formatEventDate } from "@/lib/format-date";
import { deleteCalendarEvent } from "@/features/reminders/application/calendar-event-actions";
import type { Locale } from "@/core/domain/user-settings";
import type { CalendarEvent } from "@/core/domain/calendar-event";

function CountdownBadge({ days }: { days: number }) {
  const t = useTranslations("CalendarEvents");

  if (days === 0) {
    return <span className="text-primary text-sm font-semibold">{t("list.today")}</span>;
  }
  if (days < 0) {
    return (
      <span className="text-muted-foreground text-sm">
        {t("list.daysAgo", { count: Math.abs(days) })}
      </span>
    );
  }
  return (
    <span className="text-primary text-sm font-semibold">
      {t("list.daysLeft", { count: days })}
    </span>
  );
}

export function CalendarEventList({
  events,
  onSelect,
  onDeleted,
}: {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("CalendarEvents");
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const now = new Date();

  function handleConfirmDelete() {
    if (!deletingEvent) return;
    const id = deletingEvent.id;
    startTransition(async () => {
      await deleteCalendarEvent(id);
      onDeleted(id);
      setDeletingEvent(null);
    });
  }

  if (events.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("list.empty")}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {events.map((event) => {
          const days = daysUntil(event.date, now);
          return (
            <li
              key={event.id}
              // Un evento que ya pasó se distingue de un lejano nada más que
              // por el texto pequeño del contador ("Hace 3 días" vs "Quedan
              // 3 días") si no se atenúa también la fila entera.
              className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors data-[past]:opacity-60"
              data-past={days < 0 || undefined}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                onClick={() => onSelect(event)}
              >
                <span className="flex items-center gap-1.5 truncate font-medium">
                  {event.title}
                  {event.notifyAt && (
                    <Bell
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-label={t("list.notifyBadge")}
                    />
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatEventDate(new Date(`${event.date}T00:00:00`), locale)}
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-2">
                <CountdownBadge days={days} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("list.delete")}
                  disabled={isPending}
                  onClick={() => setDeletingEvent(event)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={deletingEvent !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEvent(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("list.deleteConfirmTitle", { name: deletingEvent?.title ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("list.deleteConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmDelete}
            >
              {isPending ? t("dialog.deleting") : t("list.deleteConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
