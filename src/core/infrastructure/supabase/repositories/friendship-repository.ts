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

  async countAcceptedByOwner(ownerId: UserId): Promise<number> {
    assertUuid(ownerId);
    const { count, error } = await this.client
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${ownerId},addressee_id.eq.${ownerId}`);
    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Las amistades aceptadas de VARIOS usuarios a la vez — para las
   * sugerencias ("amigos de tus amigos"), que antes recorrían tus amigos de
   * uno en uno (una consulta por amigo en cada carga de Comunidad).
   *
   * Son dos consultas en paralelo, una por columna, en vez de un `or`: así
   * cada una entra por su propio índice (friendships_requester_id_idx /
   * friendships_addressee_id_idx). Una misma fila puede salir en las dos
   * (si los dos extremos están en la lista), de ahí el mapa por id.
   */
  async listAcceptedTouching(ownerIds: UserId[]): Promise<Friendship[]> {
    if (ownerIds.length === 0) return [];

    const [asRequester, asAddressee] = await Promise.all(
      (["requester_id", "addressee_id"] as const).map(async (column) => {
        const { data, error } = await this.client
          .from("friendships")
          .select("*")
          .eq("status", "accepted")
          .in(column, ownerIds);
        if (error) throw error;
        return data;
      }),
    );

    const byId = new Map<string, Friendship>();
    for (const row of [...asRequester!, ...asAddressee!]) byId.set(row.id, toDomain(row));
    return [...byId.values()];
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
