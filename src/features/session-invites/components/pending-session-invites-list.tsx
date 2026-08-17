"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) return null;

  function handleAccept(inviteId: string) {
    setRespondingTo(inviteId);
    startTransition(async () => {
      const { sessionId } = await acceptSessionInvite(inviteId);
      router.push(`/session/${sessionId}`);
    });
  }

  function handleDecline(inviteId: string) {
    setRespondingTo(inviteId);
    startTransition(async () => {
      await declineSessionInvite(inviteId);
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
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
            <div className="flex flex-col">
              <span className="font-medium">{t("from", { name: invite.inviterUsername })}</span>
              <span className="text-muted-foreground text-xs">
                {t("summary", {
                  count: invite.blockCount,
                  duration: formatDurationShort(invite.totalDurationSeconds),
                })}
              </span>
            </div>
            <div className="flex gap-2">
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
                variant="outline"
                size="icon-sm"
                aria-label={t("reject")}
                disabled={isPending}
                onClick={() => handleDecline(invite.id)}
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
    </div>
  );
}
