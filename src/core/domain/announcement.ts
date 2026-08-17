import type { AnnouncementId, UserId } from "@/core/domain/ids";

export interface Announcement {
  id: AnnouncementId;
  authorId: UserId;
  authorUsername: string;
  body: string;
  createdAt: Date;
}
