"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeCard } from "@/features/community/components/invite-code-card";
import { AddFriendForm } from "@/features/community/components/add-friend-form";
import { PendingRequestsList } from "@/features/community/components/pending-requests-list";
import type { FriendWithProgress } from "@/features/community/components/friends-list";
import type { PendingRequest } from "@/features/community/application/actions";

export function CommunityManager({
  inviteCode,
  initialPendingRequests,
  initialFriends,
}: {
  inviteCode: string;
  initialPendingRequests: PendingRequest[];
  initialFriends: FriendWithProgress[];
}) {
  const t = useTranslations("Community");
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);

  return (
    <div className="flex flex-col gap-6">
      <InviteCodeCard inviteCode={inviteCode} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("addFriendTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AddFriendForm />
        </CardContent>
      </Card>

      <PendingRequestsList
        requests={pendingRequests}
        onAccepted={(id) => setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== id))}
        onRemoved={(id) => setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== id))}
      />

      {/* Página propia en vez de diálogo: ver community/friends/page.tsx —
          el detalle de un amigo (con su propio <Dialog>) quedaba anidado
          dentro de este diálogo "Amigos", y ese anidamiento de diálogos de
          base-ui rompía el contenido del más interno. */}
      <Link
        href="/community/friends"
        className="border-border hover:bg-muted focus-visible:ring-ring/50 flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:outline-none"
      >
        <span className="flex items-center gap-2">
          <span className="text-base font-semibold">{t("friends.title")}</span>
          <span className="text-muted-foreground text-sm">{initialFriends.length}</span>
        </span>
        <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}
