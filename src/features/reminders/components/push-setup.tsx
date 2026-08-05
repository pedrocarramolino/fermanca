"use client";

import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/features/reminders/hooks/use-push-subscription";
import { useTimezoneSync } from "@/features/reminders/hooks/use-timezone-sync";

export function PushSetup() {
  const t = useTranslations("Reminders.push");
  useTimezoneSync();
  const { status, subscribe, unsubscribe } = usePushSubscription();

  if (status === "unsupported") {
    return <p className="text-muted-foreground text-sm">{t("unsupported")}</p>;
  }

  if (status === "checking") return null;

  if (status === "subscribed") {
    return (
      <div className="border-border flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm">
          <Bell className="text-primary size-4" />
          {t("enabled")}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={unsubscribe}>
          {t("deactivate")}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border flex items-center justify-between rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <BellOff className="size-4" />
        {t("disabled")}
      </div>
      <Button type="button" size="sm" onClick={subscribe}>
        {t("activate")}
      </Button>
    </div>
  );
}
