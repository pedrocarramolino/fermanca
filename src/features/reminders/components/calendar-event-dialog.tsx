"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/features/reminders/application/calendar-event-actions";
import type { CalendarEvent } from "@/core/domain/calendar-event";

function todayLocalKey(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function nowLocalDateTimeKey(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Inverso de lo que hace el formulario de creación al mandar `notifyAt` al
 * servidor: aquí se parte de un instante absoluto (lo que devuelve la BD) y
 * hay que rellenar un datetime-local, que espera hora local sin zona. */
function toLocalDateTimeInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Se remonta con `key={event.id}` desde el padre, así el estado inicial ya
 * sale relleno con los datos del evento correcto sin necesitar un efecto
 * que lo resincronice a mano cada vez que cambia cuál está seleccionado. */
function CalendarEventDialogContent({
  event,
  onUpdated,
  onDeleted,
  onClose,
}: {
  event: CalendarEvent;
  onUpdated: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("CalendarEvents");
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [notifyEnabled, setNotifyEnabled] = useState(event.notifyAt !== null);
  const [notifyAt, setNotifyAt] = useState(
    event.notifyAt ? toLocalDateTimeInputValue(event.notifyAt) : "",
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const notifyValid = !notifyEnabled || notifyAt !== "";
  const isPending = isSaving || isDeleting;

  function handleSave() {
    if (!title.trim() || !date || !notifyValid) return;
    setError(null);
    const notifyIso = notifyEnabled && notifyAt ? new Date(notifyAt).toISOString() : null;

    startSaving(async () => {
      try {
        const updated = await updateCalendarEvent(event.id, title, date, notifyIso);
        onUpdated(updated);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("addError"));
      }
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      await deleteCalendarEvent(event.id);
      onDeleted(event.id);
      onClose();
    });
  }

  if (confirmingDelete) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("list.deleteConfirmTitle", { name: event.title })}</DialogTitle>
          <DialogDescription>{t("list.deleteConfirmDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => setConfirmingDelete(false)}
          >
            {t("dialog.cancel")}
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? t("dialog.deleting") : t("list.deleteConfirmCta")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("dialog.title")}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-event-title">{t("form.name")}</Label>
          <Input
            id="edit-event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("form.namePlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-event-date">{t("form.date")}</Label>
          <Input
            id="edit-event-date"
            type="date"
            value={date}
            min={todayLocalKey()}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>

        <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="edit-event-notify-toggle" className="flex items-center gap-1.5">
              <Bell className="size-4" aria-hidden />
              {t("form.notify")}
            </Label>
            <Switch
              id="edit-event-notify-toggle"
              checked={notifyEnabled}
              onCheckedChange={(checked: boolean) => setNotifyEnabled(checked)}
            />
          </div>

          {notifyEnabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-event-notify-at">{t("form.notifyAt")}</Label>
              <Input
                id="edit-event-notify-at"
                type="datetime-local"
                value={notifyAt}
                min={nowLocalDateTimeKey()}
                onChange={(e) => setNotifyAt(e.target.value)}
                className="w-full sm:w-60"
              />
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setConfirmingDelete(true)}
          className="sm:mr-auto"
        >
          <Trash2 className="size-4" />
          {t("list.delete")}
        </Button>
        <Button type="button" disabled={isPending || !title.trim() || !date || !notifyValid} onClick={handleSave}>
          {isSaving ? t("dialog.saving") : t("dialog.save")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CalendarEventDialog({
  event,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {event && (
          <CalendarEventDialogContent
            key={event.id}
            event={event}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
