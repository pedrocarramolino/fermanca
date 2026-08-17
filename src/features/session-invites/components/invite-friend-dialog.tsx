"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listFriends } from "@/features/community/application/actions";
import { createSessionInvite } from "@/features/session-invites/application/actions";
import type { Friend } from "@/core/domain/friendship";
import type { DraftBlockInput } from "@/features/session-builder/application/actions";

export function InviteFriendDialog({
  open,
  onOpenChange,
  templateId,
  blocks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | null;
  blocks: DraftBlockInput[];
}) {
  const t = useTranslations("SessionInvites.dialog");
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [invitingTo, setInvitingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listFriends()
      .then((result) => {
        setFriends(result);
        setError(null);
      })
      .catch(() => setFriends([]));
  }, [open]);

  function handleInvite(friendOwnerId: string) {
    setInvitingTo(friendOwnerId);
    setError(null);
    createSessionInvite(templateId, blocks, friendOwnerId)
      .then((invite) => {
        router.push(`/session/invite/${invite.id}`);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("error"));
        setInvitingTo(null);
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {friends === null && <p className="text-muted-foreground text-sm">{t("loading")}</p>}
        {friends?.length === 0 && <p className="text-muted-foreground text-sm">{t("noFriends")}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {friends && friends.length > 0 && (
          <ul className="flex flex-col gap-2">
            {friends.map((friend) => (
              <li key={friend.friendshipId}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={invitingTo !== null}
                  onClick={() => handleInvite(friend.ownerId)}
                >
                  {friend.username}
                  {invitingTo === friend.ownerId && t("inviting")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
