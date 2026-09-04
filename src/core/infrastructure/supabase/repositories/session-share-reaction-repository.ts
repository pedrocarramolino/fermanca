import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionShareId, UserId } from "@/core/domain/ids";
import type {
  SessionShareReactionRepository,
  SessionShareReactionRow,
} from "@/core/domain/repositories/session-share-reaction-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

export class SupabaseSessionShareReactionRepository implements SessionShareReactionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForShares(shareIds: SessionShareId[]): Promise<SessionShareReactionRow[]> {
    if (shareIds.length === 0) return [];
    const { data, error } = await this.client
      .from("session_share_reactions")
      .select("session_share_id, owner_id, emoji")
      .in("session_share_id", shareIds);
    if (error) throw error;
    return data.map((row) => ({
      sessionShareId: row.session_share_id as SessionShareId,
      ownerId: row.owner_id as UserId,
      emoji: row.emoji,
    }));
  }

  // Borrar primero y mirar si algo se borró es más simple que consultar si
  // existe y decidir aparte: una sola ida y vuelta en el caso de "quitar",
  // dos en el de "añadir" (borrar no encuentra nada, se inserta).
  async toggle(shareId: SessionShareId, ownerId: UserId, emoji: string): Promise<boolean> {
    const { data: deleted, error: deleteError } = await this.client
      .from("session_share_reactions")
      .delete()
      .eq("session_share_id", shareId)
      .eq("owner_id", ownerId)
      .eq("emoji", emoji)
      .select("id");
    if (deleteError) throw deleteError;
    if (deleted.length > 0) return false;

    const { error: insertError } = await this.client
      .from("session_share_reactions")
      .insert({ session_share_id: shareId, owner_id: ownerId, emoji });
    if (insertError) throw insertError;
    return true;
  }
}
