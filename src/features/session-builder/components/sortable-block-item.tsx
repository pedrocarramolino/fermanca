"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDurationShort } from "@/core/domain/duration";
import type { DraftBlock } from "@/features/session-builder/hooks/use-session-draft";

export function SortableBlockItem({
  block,
  onRemove,
}: {
  block: DraftBlock;
  onRemove: (localId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.localId,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="border-border bg-card flex items-center gap-3 rounded-lg border p-3"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        aria-label={`Reordenar ${block.name}`}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: block.color }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{block.name}</span>
      </div>

      <span className="text-muted-foreground shrink-0 font-mono text-sm tabular-nums">
        {formatDurationShort(block.durationSeconds)}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Eliminar ${block.name}`}
        onClick={() => onRemove(block.localId)}
      >
        <X className="size-4" />
      </Button>
    </li>
  );
}
