"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createCalendarEvent } from "@/features/reminders/application/calendar-event-actions";
import type { CalendarEvent } from "@/core/domain/calendar-event";

/** "YYYY-MM-DD" de hoy en la zona horaria local del navegador — el min del
 * input de fecha usa esto para no dejar elegir un día ya pasado. */
function todayLocalKey(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** "YYYY-MM-DDTHH:mm" de ahora mismo en local — min del datetime-local para
 * no dejar programar un aviso que ya está en el pasado. */
function nowLocalDateTimeKey(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function CalendarEventForm({ onCreated }: { onCreated: (event: CalendarEvent) => void }) {
  const t = useTranslations("CalendarEvents");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayLocalKey());
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyAt, setNotifyAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const notifyValid = !notifyEnabled || notifyAt !== "";

  function handleCreate() {
    if (!title.trim() || !date || !notifyValid) return;
    setError(null);
    // `datetime-local` no lleva zona horaria — se resuelve aquí, en el
    // navegador (donde `new Date(...)` sí sabe la zona del usuario), a un
    // instante absoluto antes de mandarlo al servidor. Resolverlo en el
    // servidor en su lugar leería la hora en la zona del servidor, no la
    // del usuario.
    const notifyIso = notifyEnabled && notifyAt ? new Date(notifyAt).toISOString() : null;

    startTransition(async () => {
      try {
        const event = await createCalendarEvent(title, date, notifyIso);
        onCreated(event);
        setTitle("");
        setNotifyEnabled(false);
        setNotifyAt("");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("addError"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("form.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-title">{t("form.name")}</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("form.namePlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-date">{t("form.date")}</Label>
          <Input
            id="event-date"
            type="date"
            value={date}
            min={todayLocalKey()}
            onChange={(event) => setDate(event.target.value)}
            className="w-44"
          />
        </div>

        <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="event-notify-toggle" className="flex items-center gap-1.5">
              <Bell className="size-4" aria-hidden />
              {t("form.notify")}
            </Label>
            <Switch
              id="event-notify-toggle"
              checked={notifyEnabled}
              onCheckedChange={(checked: boolean) => setNotifyEnabled(checked)}
            />
          </div>

          {notifyEnabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-notify-at">{t("form.notifyAt")}</Label>
              <Input
                id="event-notify-at"
                type="datetime-local"
                value={notifyAt}
                min={nowLocalDateTimeKey()}
                onChange={(event) => setNotifyAt(event.target.value)}
                className="w-full sm:w-60"
              />
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !title.trim() || !date || !notifyValid}
        >
          {isPending ? t("form.adding") : t("form.add")}
        </Button>
      </CardContent>
    </Card>
  );
}
