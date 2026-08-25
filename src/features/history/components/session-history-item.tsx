"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDurationShort } from "@/core/domain/duration";
import { formatSessionDate } from "@/lib/format-date";
import { deleteSession } from "@/features/history/application/actions";
import type { Locale } from "@/core/domain/user-settings";
import type { Session } from "@/core/domain/session";

export function SessionHistoryItem({ session }: { session: Session }) {
  const t = useTranslations("SessionHistory");
  const locale = useLocale();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const STATUS_LABEL: Record<Session["status"], string> = {
    completed: t("statusCompleted"),
    abandoned: t("statusAbandoned"),
    in_progress: t("statusInProgress"),
  };

  const duration =
    session.status === "in_progress"
      ? session.plannedDurationSeconds
      : session.actualDurationSeconds;

  function handleConfirmDelete() {
    startTransition(async () => {
      await deleteSession(session.id);
      setIsDeleted(true);
      setConfirmingRemove(false);
    });
  }

  if (isDeleted) return null;

  return (
    <div className="border-border hover:bg-muted relative flex flex-col gap-2 rounded-lg border p-3 transition-colors">
      {/* Enlace "estirado": cubre toda la tarjeta para que sea clicable en
          cualquier punto, pero el botón de eliminar (position: relative,
          más adelante en el DOM) pinta por encima y sigue siendo su propio
          objetivo de clic — mismo patrón que las tarjetas con acción de
          Bootstrap. */}
      <Link
        href={`/session/${session.id}`}
        aria-label={t("viewSession", { date: formatSessionDate(session.startedAt, locale as Locale) })}
        className="absolute inset-0"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {formatSessionDate(session.startedAt, locale as Locale)}
        </span>
        <div className="flex items-center gap-1">
          <Badge variant={session.status === "completed" ? "secondary" : "outline"}>
            {STATUS_LABEL[session.status]}
          </Badge>
          {session.status !== "in_progress" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("remove")}
              className="relative z-10"
              onClick={() => setConfirmingRemove(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {session.blocks.map((block) => (
          <span
            key={block.id}
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: block.color }}
            aria-hidden
          />
        ))}
        <span className="sr-only">{session.blocks.map((block) => block.name).join(", ")}</span>
        <span className="text-muted-foreground text-xs">
          {t("blocksCount", { count: session.blocks.length })} · {formatDurationShort(duration)}
        </span>
      </div>

      {session.finalNote && (
        <p className="text-muted-foreground text-sm italic">&ldquo;{session.finalNote}&rdquo;</p>
      )}

      <Dialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("removeConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmDelete}
            >
              {isPending ? t("removing") : t("removeConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
