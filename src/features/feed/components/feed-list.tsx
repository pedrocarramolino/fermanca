"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FeedItem } from "@/features/feed/components/feed-item";
import type { SessionShare } from "@/core/domain/session-share";

export function FeedList({
  initialShares,
  currentUserId,
}: {
  initialShares: SessionShare[];
  currentUserId: string;
}) {
  const t = useTranslations("Feed");
  const [shares, setShares] = useState(initialShares);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-foreground text-base font-semibold">{t("title")}</h2>
      {shares.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shares.map((share) => (
            <FeedItem
              key={share.id}
              share={share}
              isOwn={share.ownerId === currentUserId}
              onRemoved={(id) => setShares((prev) => prev.filter((s) => s.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
