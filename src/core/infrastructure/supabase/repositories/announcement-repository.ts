import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement } from "@/core/domain/announcement";
import type { AnnouncementId, UserId } from "@/core/domain/ids";
import type { AnnouncementRepository } from "@/core/domain/repositories/announcement-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["announcements"]["Row"];

function toDomain(row: Row): Announcement {
  return {
    id: row.id as AnnouncementId,
    authorId: row.author_id as UserId,
    authorUsername: row.author_username,
    body: row.body,
    createdAt: new Date(row.created_at),
  };
}

const DEFAULT_LIST_LIMIT = 50;

export class SupabaseAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(limit = DEFAULT_LIST_LIMIT): Promise<Announcement[]> {
    const { data, error } = await this.client
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map(toDomain);
  }

  async getById(id: AnnouncementId): Promise<Announcement | null> {
    const { data, error } = await this.client
      .from("announcements")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async create(authorId: UserId, authorUsername: string, body: string): Promise<Announcement> {
    const { data, error } = await this.client
      .from("announcements")
      .insert({ author_id: authorId, author_username: authorUsername, body })
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async update(id: AnnouncementId, body: string): Promise<Announcement> {
    const { data, error } = await this.client
      .from("announcements")
      .update({ body })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async delete(id: AnnouncementId): Promise<void> {
    const { error } = await this.client.from("announcements").delete().eq("id", id);
    if (error) throw error;
  }
}
