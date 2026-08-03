"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableBlockItem } from "@/features/session-builder/components/sortable-block-item";
import type { DraftBlock } from "@/features/session-builder/hooks/use-session-draft";

export function BlockList({
  blocks,
  onReorder,
  onRemove,
}: {
  blocks: DraftBlock[];
  onReorder: (blocks: DraftBlock[]) => void;
  onRemove: (localId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((block) => block.localId === active.id);
    const newIndex = blocks.findIndex((block) => block.localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(blocks, oldIndex, newIndex));
  }

  if (blocks.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        Todavía no has añadido ningún bloque.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={blocks.map((block) => block.localId)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {blocks.map((block) => (
            <SortableBlockItem key={block.localId} block={block} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
