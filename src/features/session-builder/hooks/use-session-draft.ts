"use client";

import { useState } from "react";

export interface DraftBlock {
  /** Id local (crypto.randomUUID), solo para keys de React y dnd-kit — nunca se persiste. */
  localId: string;
  categoryId: string;
  name: string;
  durationSeconds: number;
  color: string;
}

export function useSessionDraft(initialBlocks: DraftBlock[] = []) {
  const [blocks, setBlocks] = useState<DraftBlock[]>(initialBlocks);
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);

  function addBlock(input: Omit<DraftBlock, "localId">) {
    setBlocks((prev) => [...prev, { ...input, localId: crypto.randomUUID() }]);
  }

  function removeBlock(localId: string) {
    setBlocks((prev) => prev.filter((block) => block.localId !== localId));
  }

  function reorder(newOrder: DraftBlock[]) {
    setBlocks(newOrder);
  }

  function loadTemplate(templateId: string, templateBlocks: Omit<DraftBlock, "localId">[]) {
    setBlocks(templateBlocks.map((block) => ({ ...block, localId: crypto.randomUUID() })));
    setLoadedTemplateId(templateId);
  }

  function clear() {
    setBlocks([]);
    setLoadedTemplateId(null);
  }

  const totalDurationSeconds = blocks.reduce((total, block) => total + block.durationSeconds, 0);

  /** Con `position` explícita (el índice), lista para enviar a las Server Actions. */
  const blocksInput = blocks.map((block, position) => ({
    categoryId: block.categoryId,
    name: block.name,
    durationSeconds: block.durationSeconds,
    color: block.color,
    position,
  }));

  return {
    blocks,
    blocksInput,
    addBlock,
    removeBlock,
    reorder,
    loadTemplate,
    clear,
    loadedTemplateId,
    totalDurationSeconds,
  };
}
