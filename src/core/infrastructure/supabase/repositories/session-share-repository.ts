import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionShare } from "@/core/domain/session-share";
import type { SessionBlockId, SessionId, SessionShareId, UserId } from "@/core/domain/ids";
import type { SessionShareRepository } from "@/core/domain/repositories/session-share-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["session_shares"]["Row"];

function toDomain(row: Row): SessionShare {
  return {
    id: row.id as SessionShareId,
    sessionId: row.session_id as SessionId,
    ownerId: row.owner_id as UserId,
    ownerUsername: row.owner_username,
    ownerAvatarUrl: row.owner_avatar_url,
    title: row.title,
    startedAt: new Date(row.started_at),
    totalDurationSeconds: row.total_duration_seconds,
    blocks: row.blocks as SessionShare["blocks"],
    createdAt: new Date(row.created_at),
    // Se calculan aparte (tabla session_share_reactions) y las rellena
    // quien llama cuando las necesita — ver listFeed() en application/actions.ts.
    reactions: [],
  };
}

export class SupabaseSessionShareRepository implements SessionShareRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(input: {
    sessionId: SessionId;
    ownerId: UserId;
    ownerUsername: string;
    ownerAvatarUrl: string | null;
    title: string | null;
    startedAt: Date;
    totalDurationSeconds: number;
    blocks: { id: SessionBlockId; name: string; color: string; actualDurationSeconds: number }[];
  }): Promise<SessionShare> {
    const { data, error } = await this.client
      .from("session_shares")
      .insert({
        session_id: input.sessionId,
        owner_id: input.ownerId,
        owner_username: input.ownerUsername,
        owner_avatar_url: input.ownerAvatarUrl,
        title: input.title,
        started_at: input.startedAt.toISOString(),
        total_duration_seconds: input.totalDurationSeconds,
        blocks: input.blocks,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  // Solo lo de quien mira y sus amigos aceptados, leído por autor con el
  // índice (owner_id, created_at): antes esto pedía la tabla entera y dejaba
  // que la RLS filtrase, lo que recorría las publicaciones de TODA la app en
  // cada carga del Feed. La RLS sigue aplicándose igual (la función es
  // SECURITY INVOKER) — ver la migración feed_by_authors.
  async listFeed(_viewerId: UserId, limit: number): Promise<SessionShare[]> {
    const { data, error } = await this.client.rpc("feed_session_shares", { p_limit: limit });
    if (error) throw error;
    return data.map(toDomain);
  }

  async getById(id: SessionShareId): Promise<SessionShare | null> {
    const { data, error } = await this.client
      .from("session_shares")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async findBySessionId(sessionId: SessionId, ownerId: UserId): Promise<SessionShare | null> {
    const { data, error } = await this.client
      .from("session_shares")
      .select("*")
      .eq("session_id", sessionId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async remove(id: SessionShareId, ownerId: UserId): Promise<void> {
    const { error } = await this.client
      .from("session_shares")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }
}
