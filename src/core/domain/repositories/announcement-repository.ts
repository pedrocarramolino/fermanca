import type { Announcement } from "@/core/domain/announcement";
import type { AnnouncementId, UserId } from "@/core/domain/ids";

export interface AnnouncementRepository {
  list(limit?: number): Promise<Announcement[]>;
  create(authorId: UserId, authorUsername: string, body: string): Promise<Announcement>;
  delete(id: AnnouncementId): Promise<void>;
}
