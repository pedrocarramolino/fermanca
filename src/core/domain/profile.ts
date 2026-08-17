import type { UserId } from "@/core/domain/ids";

export interface Profile {
  ownerId: UserId;
  username: string;
  inviteCode: string;
  isAdmin: boolean;
}
