"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InviteCodeCard } from "@/features/community/components/invite-code-card";
import { AddFriendForm } from "@/features/community/components/add-friend-form";
import { PendingRequestsList } from "@/features/community/components/pending-requests-list";
import { FriendsList, type FriendWithProgress } from "@/features/community/components/friends-list";
import { FriendSessionDialog } from "@/features/community/components/friend-session-dialog";
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
  const [friends, setFriends] = useState(initialFriends);
  const [friendsDialogOpen, setFriendsDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProgress | null>(null);

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

      <button
        type="button"
        className="border-border hover:bg-muted focus-visible:ring-ring/50 flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:outline-none"
        onClick={() => setFriendsDialogOpen(true)}
      >
        <span className="flex items-center gap-2">
          <span className="text-base font-semibold">{t("friends.title")}</span>
          <span className="text-muted-foreground text-sm">{friends.length}</span>
        </span>
        <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
      </button>

      <Dialog open={friendsDialogOpen} onOpenChange={setFriendsDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("friends.title")}</DialogTitle>
          </DialogHeader>
          <FriendsList
            friends={friends}
            onRemoved={(id) => setFriends((prev) => prev.filter((f) => f.friendshipId !== id))}
            onSelectFriend={(friend) => {
              // Cierra la lista antes de abrir el detalle: dos <Dialog> de
              // base-ui abiertos a la vez (uno anidado dentro del otro) deja
              // contenido del de dentro sin renderizar bien — mejor que solo
              // haya uno abierto en cada momento.
              setFriendsDialogOpen(false);
              setSelectedFriend(friend);
            }}
          />
        </DialogContent>
      </Dialog>

      <FriendSessionDialog
        friend={selectedFriend}
        open={selectedFriend !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFriend(null);
        }}
      />
    </div>
  );
}
