"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/features/reminders/hooks/use-push-subscription";

const SEEN_KEY = "practiceflow-notification-prompt-seen";

/** Aviso de una sola vez (primer inicio de sesión) para que no se pase por
 * alto que las notificaciones se activan desde Recordatorios — no vuelve a
 * aparecer tras cerrarlo, ni si ya están activadas o el navegador no las
 * admite. */
export function NotificationPromptDialog() {
  const t = useTranslations("NotificationPrompt");
  const { status } = usePushSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "checking" || status === "unsupported" || status === "subscribed") return;
    if (localStorage.getItem(SEEN_KEY)) return;
    // Depende de `status`, que llega de forma asíncrona desde el Service
    // Worker/PushManager (ver usePushSubscription) — no hay forma de
    // saberlo en el render inicial, así que sí hace falta un efecto aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [status]);

  function dismiss() {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss}>
            {t("dismiss")}
          </Button>
          <Button
            type="button"
            render={<Link href="/reminders" />}
            nativeButton={false}
            onClick={dismiss}
          >
            {t("goToReminders")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
