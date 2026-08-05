"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDurationShort } from "@/core/domain/duration";
import { formatSessionDate } from "@/lib/format-date";
import {
  getFriendLastSession,
  type FriendLastSession,
} from "@/features/community/application/actions";
import type { Locale } from "@/core/domain/user-settings";
import type { FriendWithProgress } from "@/features/community/components/friends-list";

/** Se remonta con `key={friend.ownerId}` (ver más abajo), así el estado
 * inicial "loading" ya es correcto para el nuevo amigo sin necesitar un
 * efecto que lo reinicie a mano al cambiar de `friend`. */
function FriendSessionContent({ friend }: { friend: FriendWithProgress }) {
  const t = useTranslations("Community.session");
  const tHistory = useTranslations("SessionHistory");
  const locale = useLocale() as Locale;
  const [session, setSession] = useState<FriendLastSession | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "empty" | "error">("loading");

  useEffect(() => {
    getFriendLastSession(friend.ownerId)
      .then((result) => {
        setSession(result);
        setStatus(result ? "loaded" : "empty");
      })
      .catch(() => setStatus("error"));
  }, [friend.ownerId]);

  const totalSeconds =
    session?.blocks.reduce((total, block) => total + block.actualDurationSeconds, 0) ?? 0;

  const STATUS_LABEL: Record<FriendLastSession["status"], string> = {
    completed: tHistory("statusCompleted"),
    abandoned: tHistory("statusAbandoned"),
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{friend.username}</DialogTitle>
        {session && (
          <DialogDescription>
            {formatSessionDate(new Date(session.startedAt), locale)} ·{" "}
            {STATUS_LABEL[session.status]}
          </DialogDescription>
        )}
      </DialogHeader>

      {status === "loading" && <p className="text-muted-foreground text-sm">{t("loading")}</p>}
      {status === "empty" && <p className="text-muted-foreground text-sm">{t("empty")}</p>}
      {status === "error" && <p className="text-destructive text-sm">{t("error")}</p>}

      {session && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {session.blocks.map((block) => (
              <li key={block.id} className="flex items-center gap-3 text-sm">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: block.color }}
                  aria-hidden
                />
                <span className="flex-1">{block.name}</span>
                <span className="text-muted-foreground font-mono tabular-nums">
                  {formatDurationShort(block.actualDurationSeconds)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-border flex items-center justify-between border-t pt-3 text-sm font-medium">
            <span>{t("total")}</span>
            <span className="font-mono tabular-nums">{formatDurationShort(totalSeconds)}</span>
          </div>
        </div>
      )}
    </>
  );
}

export function FriendSessionDialog({
  friend,
  open,
  onOpenChange,
}: {
  friend: FriendWithProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Community.session");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {friend ? (
          <FriendSessionContent key={friend.ownerId} friend={friend} />
        ) : (
          <DialogHeader>
            <DialogTitle>{t("lastSession")}</DialogTitle>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
