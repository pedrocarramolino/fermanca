"use client";

import { useState, useTransition } from "react";
import { Flame, Trophy, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDurationShort } from "@/core/domain/duration";
import { removeFriendship } from "@/features/community/application/actions";
import { FriendSessionDialog } from "@/features/community/components/friend-session-dialog";
import type { Friend } from "@/core/domain/friendship";
import type { FriendProgress } from "@/features/community/application/actions";

export type FriendWithProgress = Friend & FriendProgress;

export function FriendsList({
  friends,
  onRemoved,
}: {
  friends: FriendWithProgress[];
  onRemoved: (friendshipId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProgress | null>(null);

  if (friends.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        Todavía no tienes amigos — pide el código de invitación de alguien y añádelo arriba.
      </p>
    );
  }

  const sorted = [...friends].sort((a, b) => b.weeklySeconds - a.weeklySeconds);

  return (
    <>
      <ul className="flex flex-col gap-2">
        {sorted.map((friend, index) => (
          <li
            key={friend.friendshipId}
            className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
          >
            <button
              type="button"
              className="flex flex-1 flex-col items-start gap-1 text-left"
              onClick={() => setSelectedFriend(friend)}
            >
              <span className="flex items-center gap-1.5 font-medium">
                {index === 0 && friend.weeklySeconds > 0 && (
                  <Trophy
                    className="size-4 text-amber-500 dark:text-amber-400"
                    aria-hidden
                  />
                )}
                {friend.username}
              </span>
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <span>{formatDurationShort(friend.weeklySeconds)} esta semana</span>
                <span className="flex items-center gap-1">
                  <Flame className="size-3.5" />
                  {friend.currentStreak} {friend.currentStreak === 1 ? "día" : "días"}
                </span>
              </div>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Dejar de ser amigo de ${friend.username}`}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await removeFriendship(friend.friendshipId);
                  onRemoved(friend.friendshipId);
                })
              }
            >
              <UserMinus className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <FriendSessionDialog
        friend={selectedFriend}
        open={selectedFriend !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFriend(null);
        }}
      />
    </>
  );
}
