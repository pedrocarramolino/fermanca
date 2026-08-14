"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Trash2 } from "lucide-react";
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
  onDeleted,
}: {
  events: CalendarEvent[];
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("CalendarEvents");
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const now = new Date();

  if (events.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("list.empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => {
        const days = daysUntil(event.date, now);
        return (
          <li
            key={event.id}
            className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
            data-past={days < 0 || undefined}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
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
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <CountdownBadge days={days} />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("list.delete")}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteCalendarEvent(event.id);
                    onDeleted(event.id);
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
