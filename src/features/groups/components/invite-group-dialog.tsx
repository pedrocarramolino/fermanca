"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inviteGroupToSession, listMyCreatorGroups, type MyGroup } from "@/features/groups/application/actions";
import type { DraftBlockInput } from "@/features/session-builder/application/actions";

export function InviteGroupDialog({
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
  const t = useTranslations("SessionInvites.groupDialog");
  const [groups, setGroups] = useState<MyGroup[] | null>(null);
  const [invitingTo, setInvitingTo] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listMyCreatorGroups()
      .then((result) => {
        setGroups(result);
        setResult(null);
        setError(null);
      })
      .catch(() => setGroups([]));
  }, [open]);

  function handleInvite(groupId: string) {
    setInvitingTo(groupId);
    setError(null);
    setResult(null);
    inviteGroupToSession(templateId, blocks, groupId)
      .then(({ sent }) => {
        setResult(t("sent", { count: sent }));
        setInvitingTo(null);
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

        {groups === null && <p className="text-muted-foreground text-sm">{t("loading")}</p>}
        {groups?.length === 0 && <p className="text-muted-foreground text-sm">{t("noGroups")}</p>}
        {result && <p className="text-primary text-sm">{result}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {groups && groups.length > 0 && (
          <ul className="flex flex-col gap-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={invitingTo !== null}
                  onClick={() => handleInvite(group.id)}
                >
                  {group.name}
                  {invitingTo === group.id && t("inviting")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
