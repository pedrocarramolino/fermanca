"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/features/community/application/announcement-actions";
import { canEditAnnouncement } from "@/core/domain/announcement";
import { formatSessionDate } from "@/lib/format-date";
import type { Locale } from "@/core/domain/user-settings";

export interface AnnouncementItem {
  id: string;
  authorUsername: string;
  body: string;
  createdAt: string;
}

function AnnouncementForm({ onCreated }: { onCreated: (announcement: AnnouncementItem) => void }) {
  const t = useTranslations("Community.board");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createAnnouncement(trimmed);
        onCreated({
          id: created.id,
          authorUsername: created.authorUsername,
          body: created.body,
          createdAt: created.createdAt.toISOString(),
        });
        setBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("postError"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t("placeholder")}
        rows={3}
        maxLength={2000}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        type="button"
        size="sm"
        onClick={handleSubmit}
        disabled={isPending || !body.trim()}
        className="self-start"
      >
        {isPending ? t("posting") : t("post")}
      </Button>
    </div>
  );
}

/** Cuántos anuncios trae la portada de Comunidad (ver BOARD_LIST_LIMIT en
 * announcement-actions.ts) — si llegan justo esos, puede haber más, así que
 * se ofrece el enlace a "Ver todos"; si hay menos, no hace falta. */
const BOARD_PREVIEW_LIMIT = 3;

export function AnnouncementBoard({
  initialAnnouncements,
  isAdmin,
  viewAllHref,
  showHeader = true,
}: {
  initialAnnouncements: AnnouncementItem[];
  isAdmin: boolean;
  /** Si se pasa, y hay al menos BOARD_PREVIEW_LIMIT anuncios, se muestra un
   * enlace a la página con el listado completo — omitido en esa propia
   * página, que ya los enseña todos. */
  viewAllHref?: string;
  /** La página "Ver todos" ya trae su propio <h1> con el mismo título — sin
   * esto, se vería repetido dos veces seguidas. */
  showHeader?: boolean;
}) {
  const t = useTranslations("Community.board");
  const locale = useLocale() as Locale;
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditPending, startEditTransition] = useTransition();

  function handleConfirmDelete() {
    if (!deletingId) return;
    const id = deletingId;
    startTransition(async () => {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setDeletingId(null);
    });
  }

  function startEditing(announcement: AnnouncementItem) {
    setEditingId(announcement.id);
    setEditBody(announcement.body);
    setEditError(null);
  }

  function handleSaveEdit() {
    if (!editingId) return;
    const trimmed = editBody.trim();
    if (!trimmed) return;
    const id = editingId;
    startEditTransition(async () => {
      try {
        const updated = await updateAnnouncement(id, trimmed);
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, body: updated.body } : a)),
        );
        setEditingId(null);
      } catch (err) {
        setEditError(err instanceof Error ? err.message : t("editError"));
      }
    });
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4" aria-hidden />
            {t("title")}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col gap-4">
        {isAdmin && (
          <AnnouncementForm onCreated={(a) => setAnnouncements((prev) => [a, ...prev])} />
        )}

        {announcements.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {announcements.map((announcement) => {
              const isEditing = editingId === announcement.id;
              const canEdit = isAdmin && canEditAnnouncement(new Date(announcement.createdAt));
              return (
                <li
                  key={announcement.id}
                  className="border-border flex flex-col gap-1 rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground text-xs">
                      {formatSessionDate(new Date(announcement.createdAt), locale)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {canEdit && !isEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("edit")}
                          onClick={() => startEditing(announcement)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {isAdmin && !isEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("delete")}
                          onClick={() => setDeletingId(announcement.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        rows={3}
                        maxLength={2000}
                      />
                      {editError && <p className="text-destructive text-sm">{editError}</p>}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isEditPending || !editBody.trim()}
                          onClick={handleSaveEdit}
                        >
                          {isEditPending ? t("saving") : t("save")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isEditPending}
                          onClick={() => setEditingId(null)}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap">{announcement.body}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {viewAllHref && announcements.length >= BOARD_PREVIEW_LIMIT && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            render={<Link href={viewAllHref} />}
            nativeButton={false}
          >
            {t("viewAll")}
          </Button>
        )}
      </CardContent>

      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("deleteConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmDelete}
            >
              {isPending ? t("deleting") : t("deleteConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
