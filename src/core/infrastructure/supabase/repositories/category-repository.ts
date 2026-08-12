import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, CustomCategory, SystemCategorySlug } from "@/core/domain/category";
import type { CategoryId, UserId } from "@/core/domain/ids";
import type { CategoryRepository } from "@/core/domain/repositories/category-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import { assertUuid } from "@/lib/uuid";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

function toDomain(row: CategoryRow): Category {
  if (row.kind === "system") {
    return {
      kind: "system",
      id: row.id as CategoryId,
      slug: row.slug as SystemCategorySlug,
      name: row.name,
      color: row.color,
    };
  }
  return {
    kind: "custom",
    id: row.id as CategoryId,
    ownerId: row.owner_id as UserId,
    name: row.name,
    color: row.color,
    isGhost: row.is_ghost,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseCategoryRepository implements CategoryRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listAvailable(ownerId: UserId): Promise<Category[]> {
    assertUuid(ownerId);
    const { data, error } = await this.client
      .from("categories")
      .select("*")
      .or(`kind.eq.system,owner_id.eq.${ownerId}`)
      .order("kind", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data.map(toDomain);
  }

  async createCustom(input: {
    ownerId: UserId;
    name: string;
    color: string;
    isGhost: boolean;
  }): Promise<CustomCategory> {
    const { data, error } = await this.client
      .from("categories")
      .insert({
        kind: "custom",
        owner_id: input.ownerId,
        name: input.name,
        color: input.color,
        is_ghost: input.isGhost,
      })
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(data) as CustomCategory;
  }

  async updateCustom(
    id: CategoryId,
    ownerId: UserId,
    changes: Partial<Pick<CustomCategory, "name" | "color" | "isGhost">>,
  ): Promise<CustomCategory> {
    // No se puede pasar `changes` tal cual a `.update()`: `isGhost` (camelCase)
    // no coincide con la columna `is_ghost` como sí pasa por casualidad con
    // name/color, así que hay que traducir las claves explícitamente.
    const payload: Database["public"]["Tables"]["categories"]["Update"] = {};
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.color !== undefined) payload.color = changes.color;
    if (changes.isGhost !== undefined) payload.is_ghost = changes.isGhost;

    const { data, error } = await this.client
      .from("categories")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(data) as CustomCategory;
  }

  async deleteCustom(id: CategoryId, ownerId: UserId): Promise<void> {
    const { error } = await this.client
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);

    if (error) throw error;
  }
}
