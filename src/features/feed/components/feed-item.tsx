"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
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
import { hasPracticedTime } from "@/core/domain/session";
import { formatSessionDate } from "@/lib/format-date";
import { unshareFromFeed } from "@/features/feed/application/actions";
import { useReactions } from "@/features/feed/hooks/use-reactions";
import { FeedAvatar } from "@/features/feed/components/feed-avatar";
import { ReactionBar, ReactionDetails } from "@/features/feed/components/reaction-bar";
import type { SessionShare } from "@/core/domain/session-share";
import type { Locale } from "@/core/domain/user-settings";

const MAX_VISIBLE_BLOCKS = 4;

export function FeedItem({
  share,
  isOwn,
  onRemoved,
}: {
  share: SessionShare;
  isOwn: boolean;
  onRemoved: (id: string) => void;
}) {
  const t = useTranslations("Feed");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { reactions, toggle: handleToggleReaction } = useReactions("session", share.id, share.reactions);

  const practicedBlocks = share.blocks.filter(hasPracticedTime);
  const visibleBlocks = expanded ? practicedBlocks : practicedBlocks.slice(0, MAX_VISIBLE_BLOCKS);
  const hiddenCount = practicedBlocks.length - visibleBlocks.length;

  function handleConfirmRemove() {
    startTransition(async () => {
      await unshareFromFeed(share.id);
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
                {formatSessionDate(share.startedAt, locale as Locale)}
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

        {share.title && <p className="text-sm font-medium">{share.title}</p>}

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{formatDurationShort(share.totalDurationSeconds)}</span>
          <span className="text-muted-foreground text-sm">
            {t("blocksCount", { count: practicedBlocks.length })}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {visibleBlocks.map((block) => (
            <div key={block.id} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: block.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{block.name}</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {formatDurationShort(block.actualDurationSeconds)}
              </span>
            </div>
          ))}
        </div>

        {hiddenCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setExpanded(true)}
          >
            {t("viewMore", { count: hiddenCount })}
          </Button>
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
