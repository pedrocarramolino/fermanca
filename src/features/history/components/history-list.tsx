"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionHistoryItem } from "@/features/history/components/session-history-item";
import { LogManualSessionDialog } from "@/features/history/components/log-manual-session-dialog";
import { loadMoreSessions } from "@/features/history/application/actions";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";
import type { Session } from "@/core/domain/session";
import type { Category } from "@/core/domain/category";

export function HistoryList({
  initialSessions,
  categories,
}: {
  initialSessions: Session[];
  categories: Category[];
}) {
  const t = useTranslations("History");
  const [sessions, setSessions] = useState(initialSessions);
  const [hasMore, setHasMore] = useState(initialSessions.length === HISTORY_PAGE_SIZE);
  const [isPending, startTransition] = useTransition();
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  function handleLoadMore() {
    startTransition(async () => {
      const more = await loadMoreSessions(sessions.length);
      setSessions((prev) => [...prev, ...more]);
      setHasMore(more.length === HISTORY_PAGE_SIZE);
    });
  }

  function handleLogged(session: Session) {
    setSessions((prev) => [session, ...prev]);
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setLogDialogOpen(true)}
      >
        <Plus className="size-4" />
        {t("logSession")}
      </Button>

      {sessions.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <>
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
        </>
      )}

      <LogManualSessionDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        initialCategories={categories}
        onLogged={handleLogged}
      />
    </div>
  );
}
