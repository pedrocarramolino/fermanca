import type { Announcement } from "@/core/domain/announcement";
import type { AnnouncementId, UserId } from "@/core/domain/ids";

export interface AnnouncementRepository {
  list(limit?: number): Promise<Announcement[]>;
  getById(id: AnnouncementId): Promise<Announcement | null>;
  create(authorId: UserId, authorUsername: string, body: string): Promise<Announcement>;
  update(id: AnnouncementId, body: string): Promise<Announcement>;
  delete(id: AnnouncementId): Promise<void>;
}
