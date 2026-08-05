import { Button } from "@/components/ui/button";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

export function PhaseCompleteCard({
  completedBlock,
  nextBlock,
  onConfirm,
  onAddTime,
}: {
  completedBlock: RuntimeBlockInput;
  nextBlock: RuntimeBlockInput | null;
  onConfirm: () => void;
  onAddTime: (seconds: number) => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="motion-safe:animate-in motion-safe:fade-in-0 flex flex-col items-center gap-6 text-center motion-safe:duration-200"
    >
      <p className="text-muted-foreground text-sm">{completedBlock.name} completado</p>

      {nextBlock ? (
        <div className="flex flex-col items-center gap-2">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: nextBlock.color }}
            aria-hidden
          />
          <p className="text-muted-foreground text-sm">Siguiente</p>
          <p className="text-2xl font-semibold">{nextBlock.name}</p>
        </div>
      ) : (
        <p className="text-2xl font-semibold">Última fase completada</p>
      )}

      <Button type="button" size="lg" onClick={onConfirm}>
        {nextBlock ? "Siguiente fase" : "Finalizar sesión"}
      </Button>

      <div className="flex flex-col items-center gap-2">
        <p className="text-muted-foreground text-xs">
          ¿Te ha faltado tiempo en {completedBlock.name}?
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onAddTime(300)}>
            +5 min
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAddTime(600)}>
            +10 min
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAddTime(900)}>
            +15 min
          </Button>
        </div>
      </div>
    </div>
  );
}
