"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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
import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDurationShort } from "@/core/domain/duration";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

// Distancia de arrastre horizontal (px) a partir de la cual soltar borra la
// fase — por debajo, el gesto se cancela y la fila vuelve a su sitio.
const DELETE_THRESHOLD_PX = 96;
// Umbral (px) para decidir si el gesto es un swipe horizontal o un scroll
// vertical normal de la página — por debajo de esto no se toca nada.
const DIRECTION_LOCK_PX = 8;

function SortablePhaseItem({
  block,
  onRemove,
}: {
  block: RuntimeBlockInput;
  onRemove: (blockId: string) => void;
}) {
  const t = useTranslations("RemainingPhases");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const offsetXRef = useRef(0);
  const dragRef = useRef<{ startX: number; startY: number; pointerId: number; locked: boolean } | null>(
    null,
  );

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      locked: false,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.locked) {
      if (Math.abs(deltaX) < DIRECTION_LOCK_PX && Math.abs(deltaY) < DIRECTION_LOCK_PX) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // El gesto es más vertical que horizontal — es un scroll de página,
        // no un swipe: se deja de seguir este puntero.
        dragRef.current = null;
        return;
      }
      drag.locked = true;
      event.currentTarget.setPointerCapture(drag.pointerId);
      setIsSwiping(true);
    }

    event.preventDefault();
    offsetXRef.current = deltaX;
    setOffsetX(deltaX);
  }

  function endSwipe() {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsSwiping(false);
    if (!drag?.locked) {
      offsetXRef.current = 0;
      setOffsetX(0);
      return;
    }

    if (Math.abs(offsetXRef.current) > DELETE_THRESHOLD_PX) {
      const direction = offsetXRef.current > 0 ? 1 : -1;
      setOffsetX(direction * 400);
      window.setTimeout(() => onRemove(block.id), 150);
    } else {
      offsetXRef.current = 0;
      setOffsetX(0);
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="border-border bg-card relative flex items-stretch overflow-hidden rounded-lg border text-sm"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        aria-label={t("reorder", { name: block.name })}
        className="text-muted-foreground hover:text-foreground flex shrink-0 cursor-grab items-center pl-2.5 touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="relative min-w-0 flex-1">
        <div
          aria-hidden
          className="bg-destructive text-destructive-foreground absolute inset-0 flex items-center justify-center gap-2 font-medium"
        >
          <Trash2 className="size-4" />
          {t("deleteLabel")}
        </div>

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: isSwiping ? "none" : "transform 200ms ease-out",
          }}
          className="bg-card relative flex touch-pan-y items-center gap-2 py-2.5 pr-2.5 pl-2"
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: block.color }}
            aria-hidden
          />

          <span className="min-w-0 flex-1 truncate font-medium">{block.name}</span>

          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {formatDurationShort(block.plannedDurationSeconds)}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("remove", { name: block.name })}
            onClick={() => onRemove(block.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

/**
 * Cola de fases pendientes tras la que se acaba de completar, arrastrable
 * para reordenar — mismo patrón que BlockList en la pantalla de inicio
 * (añadir siempre deja la fase al final, arrastrar la coloca donde haga
 * falta), para que la experiencia sea la misma en los dos sitios. Cada fila
 * también se puede deslizar a izquierda o derecha para eliminarla (como en
 * iOS), con un botón de papelera siempre visible como alternativa accesible
 * para quien no pueda o no quiera hacer el gesto.
 */
export function RemainingPhasesList({
  blocks,
  onReorder,
  onRemove,
}: {
  blocks: RuntimeBlockInput[];
  onReorder: (orderedBlockIds: string[]) => void;
  onRemove: (blockId: string) => void;
}) {
  const t = useTranslations("RemainingPhases");
  // Colapsada por defecto: en la pantalla de fin de fase el foco es "siguiente
  // fase" / "más tiempo", no reordenar — se despliega solo si se pide.
  const [expanded, setExpanded] = useState(false);
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
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-full items-center justify-center gap-1 rounded p-1 text-xs focus-visible:ring-3 focus-visible:outline-none"
      >
        {t("title")}
        <ChevronDown
          className={cn("size-3.5 motion-safe:transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded && (
        <DndContext
          id="remaining-phases"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((block) => block.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1.5">
              {blocks.map((block) => (
                <SortablePhaseItem key={block.id} block={block} onRemove={onRemove} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
