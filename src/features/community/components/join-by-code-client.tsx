"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sendFriendRequestByCode,
  type FriendRequestError,
} from "@/features/community/application/actions";

/** Qué se ve tras abrir el enlace con sesión. Volver a abrir el enlace de
 * alguien que ya es tu amigo (o al que ya se lo pediste) no es un error:
 * se enseña como un resultado más. */
type JoinStatus = "sending" | "sent" | "accepted" | "alreadyFriends" | "alreadyRequested" | "error";

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
  const tRequest = useTranslations("Community.friendRequest");
  const [status, setStatus] = useState<JoinStatus>("sending");
  const [error, setError] = useState<FriendRequestError | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    sendFriendRequestByCode(code)
      .then((result) => {
        if (result.ok) setStatus(result.status);
        else if (result.error === "alreadyFriends" || result.error === "alreadyRequested") {
          setStatus(result.error);
        } else {
          setError(result.error);
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [authenticated, code]);

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

  if (status === "sending") {
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
        <p className="text-sm">{error ? tRequest(error) : t("genericError")}</p>
        <Button render={<Link href="/community" />} nativeButton={false}>
          {t("goToCommunity")}
        </Button>
      </div>
    );
  }

  const { title, description } = {
    sent: { title: t("sentTitle", { username: inviterUsername }), description: t("sentDescription") },
    accepted: {
      title: t("acceptedTitle", { username: inviterUsername }),
      description: t("acceptedDescription"),
    },
    alreadyFriends: {
      title: t("alreadyFriendsTitle", { username: inviterUsername }),
      description: t("alreadyFriendsDescription"),
    },
    alreadyRequested: {
      title: t("alreadyRequestedTitle", { username: inviterUsername }),
      description: t("sentDescription"),
    },
  }[status];

  return (
    <div className="flex flex-col items-center gap-3">
      <UserCheck className="text-primary size-10" aria-hidden />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
      <Button render={<Link href="/community" />} nativeButton={false}>
        {t("goToCommunity")}
      </Button>
    </div>
  );
}
