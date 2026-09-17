"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listAnnouncements } from "@/features/community/application/announcement-actions";
import { formatSessionDate } from "@/lib/format-date";
import type { AnnouncementItem } from "@/features/community/components/announcement-board";
import type { Locale } from "@/core/domain/user-settings";

/**
 * Icono en la cabecera de Comunidad (junto a perfil/configuración): al
 * tocarlo, los últimos 3 anuncios + un enlace a "ver todos". A diferencia
 * del tablón que vivía siempre en la portada de Comunidad, esto NO carga
 * nada hasta que se abre — la portada ya no espera a los anuncios para
 * pintarse. Solo lectura: publicar/editar/borrar sigue viviendo en
 * /community/announcements (AnnouncementBoard), no se duplica aquí.
 */
export function AnnouncementsQuickView() {
  const t = useTranslations("Community.board");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && announcements === null) {
      startTransition(async () => {
        const result = await listAnnouncements();
        setAnnouncements(
          result.map((a) => ({
            id: a.id,
            authorUsername: a.authorUsername,
            body: a.body,
            createdAt: a.createdAt.toISOString(),
          })),
        );
      });
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("trigger")}
        onClick={() => handleOpenChange(true)}
      >
        <Megaphone className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="size-4" aria-hidden />
              {t("title")}
            </DialogTitle>
          </DialogHeader>

          {isPending || announcements === null ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{t("loading")}</p>
          ) : announcements.length === 0 ? (
            <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              {t("empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {announcements.map((announcement) => (
                <li
                  key={announcement.id}
                  className="border-border flex flex-col gap-1 rounded-lg border p-3"
                >
                  <span className="text-muted-foreground text-xs">
                    {formatSessionDate(new Date(announcement.createdAt), locale)}
                  </span>
                  <p className="text-sm break-words whitespace-pre-wrap">{announcement.body}</p>
                </li>
              ))}
            </ul>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            render={<Link href="/community/announcements" onClick={() => setOpen(false)} />}
            nativeButton={false}
          >
            {t("viewAll")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
