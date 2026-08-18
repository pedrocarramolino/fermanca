"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
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
import {
  acceptSessionInvite,
  declineSessionInvite,
  type IncomingSessionInvite,
} from "@/features/session-invites/application/actions";

export function PendingSessionInvitesList({
  initialInvites,
}: {
  initialInvites: IncomingSessionInvite[];
}) {
  const t = useTranslations("SessionInvites.pending");
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [decliningInvite, setDecliningInvite] = useState<IncomingSessionInvite | null>(null);
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) return null;

  function handleAccept(inviteId: string) {
    setRespondingTo(inviteId);
    startTransition(async () => {
      const { sessionId } = await acceptSessionInvite(inviteId);
      router.push(`/session/${sessionId}`);
    });
  }

  function handleConfirmDecline() {
    if (!decliningInvite) return;
    const inviteId = decliningInvite.id;
    setRespondingTo(inviteId);
    startTransition(async () => {
      await declineSessionInvite(inviteId);
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
      setDecliningInvite(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-foreground text-base font-semibold">{t("title")}</h2>
      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {t("from", { name: invite.inviterUsername })}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("summary", {
                  count: invite.blockCount,
                  duration: formatDurationShort(invite.totalDurationSeconds),
                })}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="icon-sm"
                aria-label={t("accept")}
                disabled={isPending}
                onClick={() => handleAccept(invite.id)}
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label={t("reject")}
                disabled={isPending}
                onClick={() => setDecliningInvite(invite)}
              >
                <X className="size-4" />
              </Button>
            </div>
            {respondingTo === invite.id && isPending && (
              <span className="sr-only">{t("responding")}</span>
            )}
          </li>
        ))}
      </ul>

      <Dialog
        open={decliningInvite !== null}
        onOpenChange={(open) => {
          if (!open) setDecliningInvite(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("declineConfirmTitle", { name: decliningInvite?.inviterUsername ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("declineConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmDecline}
            >
              {t("declineConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
