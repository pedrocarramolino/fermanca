"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, MessageSquareOff, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadMoreGroupActivity, type GroupActivityEventInfo } from "@/features/groups/application/actions";
import { GROUP_ACTIVITY_PAGE_SIZE } from "@/features/groups/application/constants";
import { formatSessionDate } from "@/lib/format-date";
import { formatDurationShort } from "@/core/domain/duration";

const MAX_VISIBLE_BLOCKS = 4;

function SessionSummary({ summary }: { summary: NonNullable<GroupActivityEventInfo["sessionSummary"]> }) {
  const t = useTranslations("Groups.activity");
  const [expanded, setExpanded] = useState(false);
  const visibleBlocks = expanded ? summary.blocks : summary.blocks.slice(0, MAX_VISIBLE_BLOCKS);
  const hiddenCount = summary.blocks.length - visibleBlocks.length;

  return (
    <div className="mt-1 flex flex-col gap-1.5 pl-7">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{formatDurationShort(summary.totalDurationSeconds)}</span>
        <span className="text-muted-foreground text-xs">{t("blocksCount", { count: summary.blocks.length })}</span>
      </div>
      {visibleBlocks.map((block) => (
        <div key={block.id} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: block.color }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{block.name}</span>
          <span className="text-muted-foreground font-mono tabular-nums">
            {formatDurationShort(block.actualDurationSeconds)}
          </span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <Button type="button" variant="ghost" size="xs" className="self-start" onClick={() => setExpanded(true)}>
          {t("viewMore", { count: hiddenCount })}
        </Button>
      )}
    </div>
  );
}

export function GroupActivityFeed({
  groupId,
  initialEvents,
  initialHasMore,
}: {
  groupId: string;
  initialEvents: GroupActivityEventInfo[];
  initialHasMore: boolean;
}) {
  const t = useTranslations("Groups.activity");
  const [events, setEvents] = useState(initialEvents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const more = await loadMoreGroupActivity(groupId, events.length);
      setEvents((prev) => [...prev, ...more]);
      setHasMore(more.length === GROUP_ACTIVITY_PAGE_SIZE);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <MessageSquareOff className="size-3.5" aria-hidden />
        {t("noChatHint")}
      </p>

      {events.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id} className="border-border rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-3">
                {event.kind === "weekly_goal_completed" ? (
                  <CheckCircle2 className="text-primary size-4 shrink-0" aria-hidden />
                ) : (
                  <Timer className="text-muted-foreground size-4 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  {event.kind === "weekly_goal_completed"
                    ? t("weeklyGoalCompleted", { username: event.actorUsername })
                    : t("sessionFinished", { username: event.actorUsername })}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatSessionDate(new Date(event.createdAt))}
                </span>
              </div>
              {event.sessionSummary && <SessionSummary summary={event.sessionSummary} />}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button
          type="button"
          variant="outline"
          onClick={handleLoadMore}
          disabled={isPending}
          className="self-center"
        >
          {isPending ? t("loading") : t("loadMore")}
        </Button>
      )}
    </div>
  );
}
