import type { CategoryId, TemplateBlockId, TemplateId, UserId } from "@/core/domain/ids";

export interface TemplateBlock {
  id: TemplateBlockId;
  templateId: TemplateId;
  categoryId: CategoryId;
  name: string;
  durationSeconds: number;
  /** Copiado de la categoría al crear el bloque; editable después. */
  color: string;
  position: number;
}

export interface Template {
  id: TemplateId;
  ownerId: UserId;
  name: string;
  blocks: TemplateBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export function templateTotalDurationSeconds(template: Pick<Template, "blocks">): number {
  return template.blocks.reduce((total, block) => total + block.durationSeconds, 0);
}
