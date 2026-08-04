import type { Friendship } from "@/core/domain/friendship";
import type { FriendshipId, UserId } from "@/core/domain/ids";

export interface FriendshipRepository {
  /** Todas las relaciones (pendientes o aceptadas) en las que participa,
   * en cualquiera de los dos sentidos. */
  listByOwner(ownerId: UserId): Promise<Friendship[]>;
  findBetween(userA: UserId, userB: UserId): Promise<Friendship | null>;
  create(requesterId: UserId, addresseeId: UserId): Promise<Friendship>;
  accept(id: FriendshipId, addresseeId: UserId): Promise<Friendship>;
  /** Rechaza una pendiente o rompe una aceptada — mismo gesto para las
   * dos, solo cambia si el usuario debe o no la había pedido. */
  remove(id: FriendshipId, ownerId: UserId): Promise<void>;
}
