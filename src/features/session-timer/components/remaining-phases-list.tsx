"use client";

import { useTranslations } from "next-intl";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { formatDurationShort } from "@/core/domain/duration";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

function SortablePhaseItem({ block }: { block: RuntimeBlockInput }) {
  const t = useTranslations("RemainingPhases");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="border-border bg-card flex items-center gap-3 rounded-lg border p-2.5 text-sm"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        aria-label={t("reorder", { name: block.name })}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: block.color }}
        aria-hidden
      />

      <span className="min-w-0 flex-1 truncate font-medium">{block.name}</span>

      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
        {formatDurationShort(block.plannedDurationSeconds)}
      </span>
    </li>
  );
}

/**
 * Cola de fases pendientes tras la que se acaba de completar, arrastrable
 * para reordenar — mismo patrón que BlockList en la pantalla de inicio
 * (añadir siempre deja la fase al final, arrastrar la coloca donde haga
 * falta), para que la experiencia sea la misma en los dos sitios.
 */
export function RemainingPhasesList({
  blocks,
  onReorder,
}: {
  blocks: RuntimeBlockInput[];
  onReorder: (orderedBlockIds: string[]) => void;
}) {
  const t = useTranslations("RemainingPhases");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(blocks, oldIndex, newIndex).map((block) => block.id));
  }

  if (blocks.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-muted-foreground text-xs">{t("title")}</p>
      <DndContext
        id="remaining-phases"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-1.5">
            {blocks.map((block) => (
              <SortablePhaseItem key={block.id} block={block} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
