"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/features/reminders/hooks/use-push-subscription";
import { useTimezoneSync } from "@/features/reminders/hooks/use-timezone-sync";
import { sendTestStreakAlert } from "@/features/reminders/application/actions";

export function PushSetup() {
  const t = useTranslations("Reminders.push");
  useTimezoneSync();
  const { status, subscribe, unsubscribe } = usePushSubscription();
  const [testResult, setTestResult] = useState<"sent" | "empty" | null>(null);
  const [isTesting, startTest] = useTransition();

  function handleTest() {
    setTestResult(null);
    startTest(async () => {
      const { sent } = await sendTestStreakAlert();
      setTestResult(sent > 0 ? "sent" : "empty");
    });
  }

  if (status === "unsupported") {
    return <p className="text-muted-foreground text-sm">{t("unsupported")}</p>;
  }

  if (status === "checking") return null;

  if (status === "subscribed") {
    return (
      <div className="flex flex-col gap-2">
        <div className="border-border flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm">
            <Bell className="text-primary size-4" />
            {t("enabled")}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
              {isTesting ? t("testSending") : t("test")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={unsubscribe}>
              {t("deactivate")}
            </Button>
          </div>
        </div>
        {testResult === "sent" && (
          <p className="text-muted-foreground text-sm">{t("testSent")}</p>
        )}
        {testResult === "empty" && (
          <p className="text-destructive text-sm">{t("testEmpty")}</p>
        )}
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
