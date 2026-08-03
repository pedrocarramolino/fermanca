/**
 * Cálculo puro de "cómo va el bloque activo" a partir de cuándo empezó
 * realmente (timestamp real, no conteo de ticks de setInterval) — sobrevive
 * a que el navegador limite/pause los intervalos en segundo plano: al
 * volver, basta con reevaluar esta función con la hora actual.
 *
 * A diferencia de versiones anteriores, el avance entre bloques NO es
 * automático por tiempo: cuando el bloque activo agota su duración, el
 * estado pasa a "awaiting-confirmation" y se queda ahí — quien llama decide
 * cuándo confirmar el siguiente bloque (ver useSessionRuntime).
 */

export interface RuntimeBlock {
  id: string;
  plannedDurationSeconds: number;
}

export interface RuntimeStateRunning {
  status: "running";
  activeBlockIndex: number;
  elapsedInActiveBlock: number;
  remainingInActiveBlock: number;
}

export interface RuntimeStateAwaitingConfirmation {
  status: "awaiting-confirmation";
  activeBlockIndex: number;
}

export interface RuntimeStateFinished {
  status: "finished";
}

export type RuntimeState =
  RuntimeStateRunning | RuntimeStateAwaitingConfirmation | RuntimeStateFinished;

export function resolveRuntimeState(
  blocks: RuntimeBlock[],
  activeBlockIndex: number,
  activeBlockStartedAt: Date,
  now: Date,
): RuntimeState {
  if (activeBlockIndex >= blocks.length) return { status: "finished" };

  const duration = blocks[activeBlockIndex]!.plannedDurationSeconds;
  const elapsed = Math.max(0, (now.getTime() - activeBlockStartedAt.getTime()) / 1000);

  if (elapsed < duration) {
    return {
      status: "running",
      activeBlockIndex,
      elapsedInActiveBlock: elapsed,
      remainingInActiveBlock: duration - elapsed,
    };
  }

  return { status: "awaiting-confirmation", activeBlockIndex };
}
