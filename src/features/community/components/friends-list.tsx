"use client";

import { useTransition } from "react";
import { Flame, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDurationShort } from "@/core/domain/duration";
import { removeFriendship } from "@/features/community/application/actions";
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

  if (friends.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Todavía no tienes amigos — pide el código de invitación de alguien y añádelo arriba.
      </p>
    );
  }

  const sorted = [...friends].sort((a, b) => b.weeklySeconds - a.weeklySeconds);

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((friend) => (
        <li
          key={friend.friendshipId}
          className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="flex flex-col gap-1">
            <span className="font-medium">{friend.username}</span>
            <div className="text-muted-foreground flex items-center gap-3 text-sm">
              <span>{formatDurationShort(friend.weeklySeconds)} esta semana</span>
              <span className="flex items-center gap-1">
                <Flame className="size-3.5" />
                {friend.currentStreak} {friend.currentStreak === 1 ? "día" : "días"}
              </span>
            </div>
          </div>
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
  );
}
