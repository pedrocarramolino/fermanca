import type { SupabaseClient } from "@supabase/supabase-js";
import type { Template, TemplateBlock } from "@/core/domain/template";
import type { TemplateId, UserId } from "@/core/domain/ids";
import type {
  NewTemplateBlock,
  TemplateRepository,
} from "@/core/domain/repositories/template-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];
type TemplateBlockRow = Database["public"]["Tables"]["template_blocks"]["Row"];
type TemplateWithBlocksRow = TemplateRow & { template_blocks: TemplateBlockRow[] };

function blockToDomain(row: TemplateBlockRow): TemplateBlock {
  return {
    id: row.id as TemplateBlock["id"],
    templateId: row.template_id as TemplateId,
    categoryId: row.category_id as TemplateBlock["categoryId"],
    name: row.name,
    durationSeconds: row.duration_seconds,
    color: row.color,
    position: row.position,
  };
}

function toDomain(row: TemplateWithBlocksRow): Template {
  return {
    id: row.id as TemplateId,
    ownerId: row.owner_id as UserId,
    name: row.name,
    blocks: [...row.template_blocks].sort((a, b) => a.position - b.position).map(blockToDomain),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const SELECT_WITH_BLOCKS = "*, template_blocks(*)";

export class SupabaseTemplateRepository implements TemplateRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listByOwner(ownerId: UserId): Promise<Template[]> {
    const { data, error } = await this.client
      .from("templates")
      .select(SELECT_WITH_BLOCKS)
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data as TemplateWithBlocksRow[]).map(toDomain);
  }

  async getById(id: TemplateId, ownerId: UserId): Promise<Template | null> {
    const { data, error } = await this.client
      .from("templates")
      .select(SELECT_WITH_BLOCKS)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;
    return data ? toDomain(data as TemplateWithBlocksRow) : null;
  }

  async create(input: {
    ownerId: UserId;
    name: string;
    blocks: NewTemplateBlock[];
  }): Promise<Template> {
    const { data: templateRow, error: templateError } = await this.client
      .from("templates")
      .insert({ owner_id: input.ownerId, name: input.name })
      .select("*")
      .single();
    if (templateError) throw templateError;

    if (input.blocks.length > 0) {
      const { error: blocksError } = await this.client.from("template_blocks").insert(
        input.blocks.map((block) => ({
          template_id: templateRow.id,
          category_id: block.categoryId,
          name: block.name,
          duration_seconds: block.durationSeconds,
          color: block.color,
          position: block.position,
        })),
      );
      if (blocksError) throw blocksError;
    }

    const created = await this.getById(templateRow.id as TemplateId, input.ownerId);
    if (!created) throw new Error("No se pudo crear la plantilla.");
    return created;
  }

  async update(
    id: TemplateId,
    ownerId: UserId,
    changes: { name?: string; blocks?: NewTemplateBlock[] },
  ): Promise<Template> {
    if (changes.name !== undefined) {
      const { error } = await this.client
        .from("templates")
        .update({ name: changes.name, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("owner_id", ownerId);
      if (error) throw error;
    }

    if (changes.blocks !== undefined) {
      const { error: deleteError } = await this.client
        .from("template_blocks")
        .delete()
        .eq("template_id", id);
      if (deleteError) throw deleteError;

      if (changes.blocks.length > 0) {
        const { error: insertError } = await this.client.from("template_blocks").insert(
          changes.blocks.map((block) => ({
            template_id: id,
            category_id: block.categoryId,
            name: block.name,
            duration_seconds: block.durationSeconds,
            color: block.color,
            position: block.position,
          })),
        );
        if (insertError) throw insertError;
      }
    }

    const updated = await this.getById(id, ownerId);
    if (!updated) throw new Error("Plantilla no encontrada.");
    return updated;
  }

  async delete(id: TemplateId, ownerId: UserId): Promise<void> {
    const { error } = await this.client
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }
}
