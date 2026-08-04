"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptFriendRequest, removeFriendship } from "@/features/community/application/actions";
import type { PendingRequest } from "@/features/community/application/actions";

export function PendingRequestsList({
  requests,
  onAccepted,
  onRemoved,
}: {
  requests: PendingRequest[];
  onAccepted: (friendshipId: string) => void;
  onRemoved: (friendshipId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-medium">Solicitudes pendientes</h2>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li
            key={request.friendshipId}
            className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="font-medium">{request.fromUsername}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="icon-sm"
                aria-label="Aceptar"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await acceptFriendRequest(request.friendshipId);
                    onAccepted(request.friendshipId);
                    // El nuevo amigo (y su progreso) solo existen en los
                    // datos del servidor — un refresh trae esa parte que el
                    // estado local del cliente no puede rellenar solo.
                    router.refresh();
                  })
                }
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Rechazar"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await removeFriendship(request.friendshipId);
                    onRemoved(request.friendshipId);
                  })
                }
              >
                <X className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
