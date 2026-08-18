"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Flame, Trophy, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDurationShort } from "@/core/domain/duration";
import { removeFriendship } from "@/features/community/application/actions";
import { FriendSessionDialog } from "@/features/community/components/friend-session-dialog";
import type { Friend } from "@/core/domain/friendship";
import type { FriendProgress } from "@/features/community/application/actions";

export type FriendWithProgress = Friend & FriendProgress;

function FriendAvatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  return (
    <span className="border-border bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-muted-foreground text-xs font-medium">
          {username.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function FriendsList({
  friends,
  onRemoved,
}: {
  friends: FriendWithProgress[];
  onRemoved: (friendshipId: string) => void;
}) {
  const t = useTranslations("Community.friends");
  const tStreaks = useTranslations("Streaks");
  const [isPending, startTransition] = useTransition();
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProgress | null>(null);
  const [removingFriend, setRemovingFriend] = useState<FriendWithProgress | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  function handleConfirmRemove() {
    if (!removingFriend) return;
    const friendshipId = removingFriend.friendshipId;
    startTransition(async () => {
      try {
        await removeFriendship(friendshipId);
        onRemoved(friendshipId);
        setRemovingFriend(null);
        setRemoveError(null);
      } catch {
        setRemoveError(t("removeError"));
      }
    });
  }

  if (friends.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("empty")}
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
              className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:ring-3 focus-visible:outline-none"
              onClick={() => setSelectedFriend(friend)}
            >
              <FriendAvatar username={friend.username} avatarUrl={friend.avatarUrl} />
              <div className="flex min-w-0 flex-col items-start gap-1">
                <span className="flex min-w-0 max-w-full items-center gap-1.5 font-medium">
                  {index === 0 && friend.weeklySeconds > 0 && (
                    <Trophy className="text-primary size-4 shrink-0" aria-hidden />
                  )}
                  <span className="truncate">{friend.username}</span>
                </span>
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                  <span>
                    {formatDurationShort(friend.weeklySeconds)} {t("thisWeek")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="size-3.5" />
                    {tStreaks("days", { count: friend.currentStreak })}
                  </span>
                </div>
              </div>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("remove", { name: friend.username })}
              disabled={isPending}
              onClick={() => {
                setRemoveError(null);
                setRemovingFriend(friend);
              }}
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

      <Dialog
        open={removingFriend !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemovingFriend(null);
            setRemoveError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("removeConfirmTitle", { name: removingFriend?.username ?? "" })}
            </DialogTitle>
            <DialogDescription>{removeError ?? t("removeConfirmDescription")}</DialogDescription>
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
    </>
  );
}
