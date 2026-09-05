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
import { REACTION_EMOJIS, type ReactionEmoji, type ReactionSummary } from "@/core/domain/reaction";
import { formatSessionDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { toggleReaction, unshareFromFeed } from "@/features/feed/application/actions";
import { FeedAvatar } from "@/features/feed/components/feed-avatar";
import type { SessionShare } from "@/core/domain/session-share";
import type { Locale } from "@/core/domain/user-settings";

const MAX_VISIBLE_BLOCKS = 4;

/** Los 5 emojis posibles se muestran siempre, con o sin reacciones — así se
 * puede reaccionar directamente sin un selector aparte, y el que ya tiene
 * alguna reacción se distingue por el recuento junto al emoji. */
function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: ReactionSummary[];
  onToggle: (emoji: ReactionEmoji) => void;
}) {
  const t = useTranslations("Feed");

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTION_EMOJIS.map((emoji) => {
        const summary = reactions.find((r) => r.emoji === emoji);
        const count = summary?.count ?? 0;
        const reactedByMe = summary?.reactedByMe ?? false;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            aria-pressed={reactedByMe}
            aria-label={t("react", { emoji })}
            className={cn(
              "focus-visible:ring-ring/50 flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:outline-none",
              reactedByMe
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

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
  const [reactions, setReactions] = useState(share.reactions);

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

  // Optimista: el conteo/estado local cambia al instante, sin esperar al
  // servidor — si la llamada falla, se revierte al estado de antes de tocar.
  function handleToggleReaction(emoji: ReactionEmoji) {
    const previous = reactions;
    const existing = previous.find((r) => r.emoji === emoji);
    const next = !existing
      ? [...previous, { emoji, count: 1, reactedByMe: true }]
      : existing.reactedByMe && existing.count <= 1
        ? previous.filter((r) => r.emoji !== emoji)
        : previous.map((r) =>
            r.emoji === emoji
              ? { ...r, reactedByMe: !r.reactedByMe, count: r.count + (r.reactedByMe ? -1 : 1) }
              : r,
          );

    setReactions(next);
    toggleReaction(share.id, emoji).catch(() => setReactions(previous));
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
