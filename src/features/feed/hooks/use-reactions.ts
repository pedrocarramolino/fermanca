"use client";

import { useState } from "react";
import { toggleReaction, type ShareKind } from "@/features/feed/application/actions";
import type { ReactionEmoji, ReactionSummary } from "@/core/domain/reaction";

/** Estado + toggle optimista de las reacciones de una publicación —
 * compartido entre FeedItem y WeeklyGoalFeedItem, que solo difieren en qué
 * `kind` pasan (la tabla de reacciones a tocar la decide el servidor a
 * partir de eso, ver toggleReaction en application/actions.ts). */
export function useReactions(kind: ShareKind, shareId: string, initial: ReactionSummary[]) {
  const [reactions, setReactions] = useState(initial);

  // Optimista: el conteo/estado local cambia al instante, sin esperar al
  // servidor — si la llamada falla, se revierte al estado de antes de tocar.
  function toggle(emoji: ReactionEmoji) {
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
    toggleReaction(kind, shareId, emoji).catch(() => setReactions(previous));
  }

  return { reactions, toggle };
}
