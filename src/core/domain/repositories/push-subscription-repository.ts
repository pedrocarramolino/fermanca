import type { PushSubscription } from "@/core/domain/push-subscription";
import type { UserId } from "@/core/domain/ids";

export interface PushSubscriptionRepository {
  /** Upsert por endpoint: re-suscribirse desde el mismo navegador no duplica fila. */
  save(subscription: PushSubscription): Promise<void>;
  deleteByEndpoint(endpoint: string): Promise<void>;
  listByOwner(ownerId: UserId): Promise<PushSubscription[]>;
}
