import type { Template, TemplateBlock } from "@/core/domain/template";
import type { TemplateId, UserId } from "@/core/domain/ids";

export type NewTemplateBlock = Omit<TemplateBlock, "id" | "templateId">;

export interface TemplateRepository {
  listByOwner(ownerId: UserId): Promise<Template[]>;
  getById(id: TemplateId, ownerId: UserId): Promise<Template | null>;
  create(input: { ownerId: UserId; name: string; blocks: NewTemplateBlock[] }): Promise<Template>;
  update(
    id: TemplateId,
    ownerId: UserId,
    changes: { name?: string; blocks?: NewTemplateBlock[] },
  ): Promise<Template>;
  delete(id: TemplateId, ownerId: UserId): Promise<void>;
}
