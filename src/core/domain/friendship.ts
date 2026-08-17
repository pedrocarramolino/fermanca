import type { FriendshipId, UserId } from "@/core/domain/ids";

export type FriendshipStatus = "pending" | "accepted";

export interface Friendship {
  id: FriendshipId;
  requesterId: UserId;
  addresseeId: UserId;
  status: FriendshipStatus;
  createdAt: Date;
}

/** Amigo aceptado, ya resuelto al "otro lado" de la relación (no importa
 * quién pidió amistad a quién) — lo que consume la UI de Comunidad. */
export interface Friend {
  friendshipId: FriendshipId;
  ownerId: UserId;
  username: string;
  avatarUrl: string | null;
}
