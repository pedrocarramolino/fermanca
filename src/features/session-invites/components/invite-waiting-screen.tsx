"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authenticateRealtime, createClient } from "@/core/infrastructure/supabase/client";
import { cancelSessionInvite } from "@/features/session-invites/application/actions";
import type { SessionInviteStatus } from "@/core/domain/session-invite";

export function InviteWaitingScreen({
  inviteId,
  initialStatus,
  friendUsername,
}: {
  inviteId: string;
  initialStatus: SessionInviteStatus;
  friendUsername: string;
}) {
  const t = useTranslations("SessionInvites.waiting");
  const router = useRouter();
  const [status, setStatus] = useState<SessionInviteStatus>(initialStatus);
  const [isCancelling, startCancelling] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    if (status !== "pending") return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    // Autenticar el socket antes de suscribirse — sin esto se conecta como
    // anónimo y la RLS de session_invites (exige auth.uid()) no deja pasar
    // ningún evento, aunque el canal se suscriba sin error.
    void authenticateRealtime(supabase).then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`session-invite-${inviteId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "session_invites",
            filter: `id=eq.${inviteId}`,
          },
          (payload) => {
            const row = payload.new as {
              status: SessionInviteStatus;
              inviter_session_id: string | null;
            };
            if (row.status === "accepted" && row.inviter_session_id) {
              router.push(`/session/${row.inviter_session_id}`);
              return;
            }
            setStatus(row.status);
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [inviteId, status, router]);

  function handleCancel() {
    startCancelling(async () => {
      await cancelSessionInvite(inviteId);
      setStatus("cancelled");
      setConfirmingCancel(false);
    });
  }

  if (status === "declined") {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="text-lg font-medium">{t("declined", { name: friendUsername })}</p>
        <Button type="button" render={<Link href="/" />} nativeButton={false}>
          {t("backToBuilder")}
        </Button>
      </main>
    );
  }

  if (status === "cancelled") {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="text-lg font-medium">{t("cancelled")}</p>
        <Button type="button" render={<Link href="/" />} nativeButton={false}>
          {t("backToBuilder")}
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="text-muted-foreground text-sm">{t("waitingFor", { name: friendUsername })}</p>
      <p className="text-2xl font-semibold">{t("title")}</p>
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="ghost" render={<Link href="/" />} nativeButton={false}>
            {t("backToBuilder")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isCancelling}
            onClick={() => setConfirmingCancel(true)}
          >
            {t("cancel")}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{t("backHint")}</p>
      </div>

      <Dialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("cancelConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={handleCancel}
            >
              {isCancelling ? t("cancelling") : t("cancelConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
