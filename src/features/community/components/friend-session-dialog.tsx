"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDurationShort } from "@/core/domain/duration";
import { formatSessionDate } from "@/lib/format-date";
import {
  getFriendLastSession,
  getFriendsOfFriend,
  sendFriendRequestToUser,
  type FriendLastSession,
  type FriendOfFriend,
} from "@/features/community/application/actions";
import type { Locale } from "@/core/domain/user-settings";
import type { FriendWithProgress } from "@/features/community/components/friends-list";

/** Se remonta con `key={friend.ownerId}` (ver más abajo), así el estado
 * inicial "loading" ya es correcto para el nuevo amigo sin necesitar un
 * efecto que lo reinicie a mano al cambiar de `friend`. */
function FriendSessionContent({ friend }: { friend: FriendWithProgress }) {
  const t = useTranslations("Community.session");
  const tHistory = useTranslations("SessionHistory");
  const tFriends = useTranslations("Community.friendsOfFriend");
  const locale = useLocale() as Locale;
  const [session, setSession] = useState<FriendLastSession | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "empty" | "error">("loading");
  const [friendsOfFriend, setFriendsOfFriend] = useState<FriendOfFriend[] | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    getFriendLastSession(friend.ownerId)
      .then((result) => {
        setSession(result);
        setStatus(result ? "loaded" : "empty");
      })
      .catch(() => setStatus("error"));
    getFriendsOfFriend(friend.ownerId)
      .then(setFriendsOfFriend)
      .catch(() => setFriendsOfFriend([]));
  }, [friend.ownerId]);

  function handleAddFriend(ownerId: string) {
    setSendingTo(ownerId);
    sendFriendRequestToUser(ownerId)
      .then(() => {
        setFriendsOfFriend((prev) =>
          prev?.map((f) => (f.ownerId === ownerId ? { ...f, relationship: "pending" } : f)) ?? null,
        );
      })
      .catch(() => {
        // El botón se queda en "Añadir" y el usuario puede reintentarlo.
      })
      .finally(() => setSendingTo(null));
  }

  const totalSeconds =
    session?.blocks.reduce((total, block) => total + block.actualDurationSeconds, 0) ?? 0;

  const STATUS_LABEL: Record<FriendLastSession["status"], string> = {
    completed: tHistory("statusCompleted"),
    abandoned: tHistory("statusAbandoned"),
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{friend.username}</DialogTitle>
        {session && (
          <DialogDescription>
            {formatSessionDate(new Date(session.startedAt), locale)} ·{" "}
            {STATUS_LABEL[session.status]}
          </DialogDescription>
        )}
      </DialogHeader>

      {status === "loading" && <p className="text-muted-foreground text-sm">{t("loading")}</p>}
      {status === "empty" && <p className="text-muted-foreground text-sm">{t("empty")}</p>}
      {status === "error" && <p className="text-destructive text-sm">{t("error")}</p>}

      {session && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {session.blocks.map((block) => (
              <li key={block.id} className="flex items-center gap-3 text-sm">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: block.color }}
                  aria-hidden
                />
                <span className="flex-1">{block.name}</span>
                <span className="text-muted-foreground font-mono tabular-nums">
                  {formatDurationShort(block.actualDurationSeconds)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-border flex items-center justify-between border-t pt-3 text-sm font-medium">
            <span>{t("total")}</span>
            <span className="font-mono tabular-nums">{formatDurationShort(totalSeconds)}</span>
          </div>
        </div>
      )}

      {friendsOfFriend && friendsOfFriend.length > 0 && (
        <div className="border-border flex flex-col gap-2 border-t pt-3">
          <p className="text-sm font-medium">
            {tFriends("title", { name: friend.username })}
          </p>
          <ul className="flex flex-col gap-2">
            {friendsOfFriend.map((fof) => (
              <li key={fof.ownerId} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{fof.username}</span>
                {fof.relationship === "accepted" && (
                  <span className="text-muted-foreground text-xs">{tFriends("alreadyFriends")}</span>
                )}
                {fof.relationship === "pending" && (
                  <span className="text-muted-foreground text-xs">{tFriends("pending")}</span>
                )}
                {fof.relationship === "none" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={sendingTo === fof.ownerId}
                    onClick={() => handleAddFriend(fof.ownerId)}
                  >
                    <UserPlus className="size-3.5" />
                    {sendingTo === fof.ownerId ? tFriends("sending") : tFriends("add")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function FriendSessionDialog({
  friend,
  open,
  onOpenChange,
}: {
  friend: FriendWithProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Community.session");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {friend ? (
          <FriendSessionContent key={friend.ownerId} friend={friend} />
        ) : (
          <DialogHeader>
            <DialogTitle>{t("lastSession")}</DialogTitle>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
