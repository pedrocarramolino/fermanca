import type { UserId } from "@/core/domain/ids";

export interface PushSubscription {
  ownerId: UserId;
  endpoint: string;
  p256dh: string;
  auth: string;
}
