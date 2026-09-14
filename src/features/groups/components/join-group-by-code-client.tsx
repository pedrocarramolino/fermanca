"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, UsersRound, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinGroupByCode } from "@/features/groups/application/actions";

export function JoinGroupByCodeClient({
  code,
  groupName,
  authenticated,
}: {
  code: string;
  groupName: string;
  authenticated: boolean;
}) {
  const t = useTranslations("Groups.joinLink");
  const [status, setStatus] = useState<"idle" | "joining" | "joined" | "error">(
    authenticated ? "joining" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    joinGroupByCode(code)
      .then(() => setStatus("joined"))
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : t("genericError"));
        setStatus("error");
      });
  }, [authenticated, code, t]);

  if (!authenticated) {
    const next = encodeURIComponent(`/community/groups/join/${code}`);
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-lg">
          {t.rich("invitedBy", { name: groupName, strong: (chunks) => <strong>{chunks}</strong> })}
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

  if (status === "joining" || status === "idle") {
    return (
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
        <p className="text-muted-foreground text-sm">{t("joining", { name: groupName })}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3">
        <UserX className="text-muted-foreground size-8" aria-hidden />
        <p className="text-sm">{errorMessage}</p>
        <Button render={<Link href="/community/groups" />} nativeButton={false}>
          {t("goToGroups")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <UsersRound className="text-primary size-10" aria-hidden />
      <p className="text-lg font-medium">{t("joinedTitle", { name: groupName })}</p>
      <Button render={<Link href="/community/groups" />} nativeButton={false}>
        {t("goToGroups")}
      </Button>
    </div>
  );
}
