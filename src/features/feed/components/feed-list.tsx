"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FeedItem } from "@/features/feed/components/feed-item";
import { WeeklyGoalFeedItem } from "@/features/feed/components/weekly-goal-feed-item";
import type { FeedEntry } from "@/features/feed/application/actions";

export function FeedList({
  initialEntries,
  currentUserId,
}: {
  initialEntries: FeedEntry[];
  currentUserId: string;
}) {
  const t = useTranslations("Feed");
  const [entries, setEntries] = useState(initialEntries);

  function handleRemoved(id: string) {
    setEntries((prev) => prev.filter((entry) => entry.share.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-foreground text-base font-semibold">{t("title")}</h2>
      {entries.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) =>
            entry.kind === "session" ? (
              <FeedItem
                key={entry.share.id}
                share={entry.share}
                isOwn={entry.share.ownerId === currentUserId}
                onRemoved={handleRemoved}
              />
            ) : (
              <WeeklyGoalFeedItem
                key={entry.share.id}
                share={entry.share}
                isOwn={entry.share.ownerId === currentUserId}
                onRemoved={handleRemoved}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
