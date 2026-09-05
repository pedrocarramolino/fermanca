"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flame, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { unshareWeeklyGoalFromFeed } from "@/features/feed/application/actions";
import { useReactions } from "@/features/feed/hooks/use-reactions";
import { FeedAvatar } from "@/features/feed/components/feed-avatar";
import { ReactionBar, ReactionDetails } from "@/features/feed/components/reaction-bar";
import type { WeeklyGoalShare } from "@/core/domain/weekly-goal-share";
import type { Locale } from "@/core/domain/user-settings";

/** Publicación de "objetivo semanal cumplido" — misma cabecera, diálogo de
 * confirmación y barra de reacciones que FeedItem, pero sin bloques que
 * expandir: es un logro puntual, no una sesión con detalle. */
export function WeeklyGoalFeedItem({
  share,
  isOwn,
  onRemoved,
}: {
  share: WeeklyGoalShare;
  isOwn: boolean;
  onRemoved: (id: string) => void;
}) {
  const t = useTranslations("Feed");
  const tStreaks = useTranslations("Streaks");
  const locale = useLocale();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { reactions, toggle: handleToggleReaction } = useReactions(
    "weekly-goal",
    share.id,
    share.reactions,
  );

  function handleConfirmRemove() {
    startTransition(async () => {
      await unshareWeeklyGoalFromFeed(share.id);
      onRemoved(share.id);
      setConfirmingRemove(false);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <FeedAvatar username={share.ownerUsername} avatarUrl={share.ownerAvatarUrl} />
            <div className="flex flex-col">
              <span className="text-sm font-medium">@{share.ownerUsername}</span>
              <span className="text-muted-foreground text-xs">
                {formatSessionDate(share.createdAt, locale as Locale)}
              </span>
            </div>
          </div>
          {isOwn && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("remove")}
              onClick={() => setConfirmingRemove(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        <div className="bg-primary/10 flex items-center gap-3 rounded-lg p-3">
          <Target className="text-primary size-6 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold">{t("weeklyGoalAchieved")}</span>
            <span className="text-muted-foreground text-xs">
              {t("weeklyGoalStats", {
                duration: formatDurationShort(share.practicedSeconds),
                days: share.practicedDays,
                target: share.targetDays,
              })}
            </span>
          </div>
        </div>

        {share.streakDays > 1 && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Flame className="size-3.5" />
            {tStreaks("days", { count: share.streakDays })}
          </span>
        )}

        <ReactionBar reactions={reactions} onToggle={handleToggleReaction} />
        {isOwn && <ReactionDetails reactions={reactions} />}
      </CardContent>

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
              onClick={handleConfirmRemove}
            >
              {isPending ? t("removing") : t("removeConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
