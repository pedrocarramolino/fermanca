"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeCard } from "@/features/community/components/invite-code-card";
import { AddFriendForm } from "@/features/community/components/add-friend-form";
import { PendingRequestsList } from "@/features/community/components/pending-requests-list";
import { FriendsList, type FriendWithProgress } from "@/features/community/components/friends-list";
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
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [friends, setFriends] = useState(initialFriends);

  return (
    <div className="flex flex-col gap-6">
      <InviteCodeCard inviteCode={inviteCode} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Añadir amigo</CardTitle>
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

      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-semibold">Amigos</h2>
        <FriendsList
          friends={friends}
          onRemoved={(id) => setFriends((prev) => prev.filter((f) => f.friendshipId !== id))}
        />
      </div>
    </div>
  );
}
