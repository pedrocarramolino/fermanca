import type { Profile } from "@/core/domain/profile";
import type { UserId } from "@/core/domain/ids";

export interface ProfileRepository {
  getByOwnerId(ownerId: UserId): Promise<Profile | null>;
  getByUsername(username: string): Promise<Profile | null>;
  getByInviteCode(inviteCode: string): Promise<Profile | null>;
  updateUsername(ownerId: UserId, username: string): Promise<Profile>;
  updateAvatarUrl(ownerId: UserId, avatarUrl: string | null): Promise<Profile>;
}
