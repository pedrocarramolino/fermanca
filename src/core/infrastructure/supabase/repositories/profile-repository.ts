import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/core/domain/profile";
import type { UserId } from "@/core/domain/ids";
import type { ProfileRepository } from "@/core/domain/repositories/profile-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["profiles"]["Row"];

/** `ilike` trata el patrón como LIKE (% y _ son comodines) — un username
 * con guión bajo (permitido por el formato) rompería una búsqueda exacta
 * sin esto, ya que "_" pasaría a significar "cualquier carácter". */
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

function toDomain(row: Row): Profile {
  return {
    ownerId: row.owner_id as UserId,
    username: row.username,
    inviteCode: row.invite_code,
    isAdmin: row.is_admin,
    avatarUrl: row.avatar_url,
  };
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getByOwnerId(ownerId: UserId): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async getByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .ilike("username", escapeLikePattern(username))
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async getByInviteCode(inviteCode: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async updateUsername(ownerId: UserId, username: string): Promise<Profile> {
    const { data, error } = await this.client
      .from("profiles")
      .update({ username })
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async updateAvatarUrl(ownerId: UserId, avatarUrl: string | null): Promise<Profile> {
    const { data, error } = await this.client
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }
}
