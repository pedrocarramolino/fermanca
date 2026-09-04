import type { SupabaseClient } from "@supabase/supabase-js";
import type { Friendship, FriendshipStatus } from "@/core/domain/friendship";
import type { FriendshipId, UserId } from "@/core/domain/ids";
import type { FriendshipRepository } from "@/core/domain/repositories/friendship-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import { assertUuid } from "@/lib/uuid";

type Row = Database["public"]["Tables"]["friendships"]["Row"];

function toDomain(row: Row): Friendship {
  return {
    id: row.id as FriendshipId,
    requesterId: row.requester_id as UserId,
    addresseeId: row.addressee_id as UserId,
    status: row.status as FriendshipStatus,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseFriendshipRepository implements FriendshipRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listByOwner(ownerId: UserId): Promise<Friendship[]> {
    assertUuid(ownerId);
    const { data, error } = await this.client
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${ownerId},addressee_id.eq.${ownerId}`);
    if (error) throw error;
    return data.map(toDomain);
  }

  async findBetween(userA: UserId, userB: UserId): Promise<Friendship | null> {
    // low_id/high_id son columnas generadas (least/greatest) — filtrar por
    // ellas en vez de por requester/addressee encuentra la fila sin
    // importar quién la pidió.
    const low = userA < userB ? userA : userB;
    const high = userA < userB ? userB : userA;
    const { data, error } = await this.client
      .from("friendships")
      .select("*")
      .eq("low_id", low)
      .eq("high_id", high)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async create(requesterId: UserId, addresseeId: UserId): Promise<Friendship> {
    const { data, error } = await this.client
      .from("friendships")
      .insert({ requester_id: requesterId, addressee_id: addresseeId })
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async accept(id: FriendshipId, addresseeId: UserId): Promise<Friendship> {
    const { data, error } = await this.client
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("addressee_id", addresseeId)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async remove(id: FriendshipId, ownerId: UserId): Promise<void> {
    assertUuid(ownerId);
    const { error } = await this.client
      .from("friendships")
      .delete()
      .eq("id", id)
      .or(`requester_id.eq.${ownerId},addressee_id.eq.${ownerId}`);
    if (error) throw error;
  }
}
