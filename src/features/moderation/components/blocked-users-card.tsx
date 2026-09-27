"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { unblockUser, type BlockedUser } from "@/features/moderation/application/actions";
import { FeedAvatar } from "@/features/feed/components/feed-avatar";

/** Ajustes → a quién has bloqueado, con la opción de desbloquear. */
export function BlockedUsersCard({ initialBlocked }: { initialBlocked: BlockedUser[] }) {
  const t = useTranslations("Moderation.blockedList");
  const [blocked, setBlocked] = useState(initialBlocked);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();

  function handleUnblock(ownerId: string) {
    setError(false);
    setUnblockingId(ownerId);
    startTransition(async () => {
      try {
        await unblockUser(ownerId);
        setBlocked((prev) => prev.filter((user) => user.ownerId !== ownerId));
      } catch {
        setError(true);
      } finally {
        setUnblockingId(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Ban className="size-4" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {blocked.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blocked.map((user) => (
              <li key={user.ownerId} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FeedAvatar username={user.username} avatarUrl={user.avatarUrl} />
                  <span className="truncate font-medium">@{user.username}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={unblockingId !== null}
                  onClick={() => handleUnblock(user.ownerId)}
                >
                  {unblockingId === user.ownerId ? t("unblocking") : t("unblock")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {blocked.length > 0 && <p className="text-muted-foreground text-xs">{t("unblockHint")}</p>}
        {error && <p className="text-destructive text-sm">{t("error")}</p>}
      </CardContent>
    </Card>
  );
}
