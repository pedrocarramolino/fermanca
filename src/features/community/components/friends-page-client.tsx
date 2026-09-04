"use client";

import { useState } from "react";
import { FriendsList, type FriendWithProgress } from "@/features/community/components/friends-list";
import { FriendSessionDialog } from "@/features/community/components/friend-session-dialog";

/** Página propia en vez de diálogo a propósito: el diálogo de detalle de un
 * amigo (que a su vez puede abrir el visor de la foto) quedaba anidado
 * dentro del diálogo "Amigos" — dos/tres `<Dialog>` de base-ui abiertos a la
 * vez rompían el contenido del más interno. Aquí solo hay un `<Dialog>` (el
 * de detalle) abierto sobre una página normal, así que no hay anidación. */
export function FriendsPageClient({ initialFriends }: { initialFriends: FriendWithProgress[] }) {
  const [friends, setFriends] = useState(initialFriends);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProgress | null>(null);

  return (
    <>
      <FriendsList
        friends={friends}
        onRemoved={(id) => setFriends((prev) => prev.filter((f) => f.friendshipId !== id))}
        onSelectFriend={setSelectedFriend}
      />
      <FriendSessionDialog
        friend={selectedFriend}
        open={selectedFriend !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFriend(null);
        }}
      />
    </>
  );
}
