"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SessionHistoryItem } from "@/features/history/components/session-history-item";
import { loadMoreSessions } from "@/features/history/application/actions";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";
import type { Session } from "@/core/domain/session";

export function HistoryList({ initialSessions }: { initialSessions: Session[] }) {
  const t = useTranslations("History");
  const [sessions, setSessions] = useState(initialSessions);
  const [hasMore, setHasMore] = useState(initialSessions.length === HISTORY_PAGE_SIZE);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const more = await loadMoreSessions(sessions.length);
      setSessions((prev) => [...prev, ...more]);
      setHasMore(more.length === HISTORY_PAGE_SIZE);
    });
  }

  if (sessions.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => (
        <SessionHistoryItem key={session.id} session={session} />
      ))}

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
