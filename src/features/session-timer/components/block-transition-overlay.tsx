import type { TransitionInfo } from "@/features/session-timer/hooks/use-session-runtime";

export function BlockTransitionOverlay({ transition }: { transition: TransitionInfo | null }) {
  if (!transition) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background/80 motion-safe:animate-in motion-safe:fade-in-0 pointer-events-none fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm motion-safe:duration-200"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        {transition.completedBlock && (
          <p className="text-muted-foreground text-sm">
            {transition.completedBlock.name} completado
          </p>
        )}
        {transition.nextBlock ? (
          <>
            <span
              className="size-4 shrink-0 rounded-full"
              style={{ backgroundColor: transition.nextBlock.color }}
              aria-hidden
            />
            <p className="text-2xl font-semibold">{transition.nextBlock.name}</p>
          </>
        ) : (
          <p className="text-2xl font-semibold">Sesión completada</p>
        )}
      </div>
    </div>
  );
}
