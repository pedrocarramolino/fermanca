"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendFriendRequestByCode } from "@/features/community/application/actions";

export function JoinByCodeClient({
  code,
  inviterUsername,
  authenticated,
}: {
  code: string;
  inviterUsername: string;
  authenticated: boolean;
}) {
  const t = useTranslations("Community.join");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    authenticated ? "sending" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    sendFriendRequestByCode(code)
      .then(() => setStatus("sent"))
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : t("genericError"));
        setStatus("error");
      });
  }, [authenticated, code, t]);

  if (!authenticated) {
    const next = encodeURIComponent(`/community/join/${code}`);
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-lg">
          {t.rich("invitedBy", { username: inviterUsername, strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button render={<Link href={`/register?next=${next}`} />} nativeButton={false}>
            {t("createAccount")}
          </Button>
          <Button
            type="button"
            variant="outline"
            render={<Link href={`/login?next=${next}`} />}
            nativeButton={false}
          >
            {t("alreadyHaveAccount")}
          </Button>
        </div>
      </div>
    );
  }

  if (status === "sending" || status === "idle") {
    return (
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
        <p className="text-muted-foreground text-sm">
          {t("sending", { username: inviterUsername })}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3">
        <UserX className="text-muted-foreground size-8" aria-hidden />
        <p className="text-sm">{errorMessage}</p>
        <Button render={<Link href="/community" />} nativeButton={false}>
          {t("goToCommunity")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <UserCheck className="text-primary size-10" aria-hidden />
      <p className="text-lg font-medium">{t("sentTitle", { username: inviterUsername })}</p>
      <p className="text-muted-foreground text-sm">{t("sentDescription")}</p>
      <Button render={<Link href="/community" />} nativeButton={false}>
        {t("goToCommunity")}
      </Button>
    </div>
  );
}
