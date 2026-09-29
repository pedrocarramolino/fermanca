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
  const [status, setStatus] = useState<
    "joining" | "joined" | "alreadyMember" | "invalidCode" | "error"
  >("joining");
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    joinGroupByCode(code)
      .then((result) => {
        if (!result.ok) {
          setStatus(result.error);
          return;
        }
        setGroupId(result.group.id);
        setStatus(result.alreadyMember ? "alreadyMember" : "joined");
      })
      .catch(() => setStatus("error"));
  }, [authenticated, code]);

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

  if (status === "joining") {
    return (
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
        <p className="text-muted-foreground text-sm">{t("joining", { name: groupName })}</p>
      </div>
    );
  }

  if (status === "error" || status === "invalidCode") {
    return (
      <div className="flex flex-col items-center gap-3">
        <UserX className="text-muted-foreground size-8" aria-hidden />
        <p className="text-sm">
          {status === "invalidCode" ? t("invalidDescription") : t("genericError")}
        </p>
        <Button render={<Link href="/community/groups" />} nativeButton={false}>
          {t("goToGroups")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <UsersRound className="text-primary size-10" aria-hidden />
      <p className="text-lg font-medium">
        {status === "alreadyMember"
          ? t("alreadyMemberTitle", { name: groupName })
          : t("joinedTitle", { name: groupName })}
      </p>
      <Button
        render={<Link href={groupId ? `/community/groups/${groupId}` : "/community/groups"} />}
        nativeButton={false}
      >
        {t("goToGroup")}
      </Button>
    </div>
  );
}
