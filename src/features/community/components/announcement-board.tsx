"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone, Trash2 } from "lucide-react";
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
} from "@/features/community/application/announcement-actions";
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

export function AnnouncementBoard({
  initialAnnouncements,
  isAdmin,
}: {
  initialAnnouncements: AnnouncementItem[];
  isAdmin: boolean;
}) {
  const t = useTranslations("Community.board");
  const locale = useLocale() as Locale;
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirmDelete() {
    if (!deletingId) return;
    const id = deletingId;
    startTransition(async () => {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setDeletingId(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>
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
            {announcements.map((announcement) => (
              <li
                key={announcement.id}
                className="border-border flex flex-col gap-1 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatSessionDate(new Date(announcement.createdAt), locale)}
                  </span>
                  {isAdmin && (
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
                <p className="text-sm break-words whitespace-pre-wrap">{announcement.body}</p>
              </li>
            ))}
          </ul>
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
