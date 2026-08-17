import type { NewTemplateBlock } from "@/core/domain/repositories/template-repository";
import type { NewSessionBlock } from "@/core/domain/repositories/session-repository";
import type { CategoryId } from "@/core/domain/ids";

/**
 * Mapeos puros, en un módulo aparte (no "use server"): un archivo con esa
 * directiva solo puede exportar funciones async (Next.js las trata a todas
 * como Server Actions) — estas se usan también desde session-invites, que
 * las necesita síncronas.
 */
export interface DraftBlockInput {
  categoryId: string;
  name: string;
  durationSeconds: number;
  color: string;
  position: number;
}

export function toNewTemplateBlocks(blocks: DraftBlockInput[]): NewTemplateBlock[] {
  return blocks.map((block) => ({
    categoryId: block.categoryId as CategoryId,
    name: block.name,
    durationSeconds: block.durationSeconds,
    color: block.color,
    position: block.position,
  }));
}

export function toNewSessionBlocks(blocks: DraftBlockInput[]): NewSessionBlock[] {
  return blocks.map((block) => ({
    categoryId: block.categoryId as CategoryId,
    name: block.name,
    color: block.color,
    position: block.position,
    plannedDurationSeconds: block.durationSeconds,
  }));
}
