/**
 * Cálculo puro de "qué bloque toca ahora" a partir de timestamps reales
 * (Date.now()), no de conteo de ticks de setInterval. Esto es lo que hace
 * que el temporizador sobreviva a que el navegador limite/pause los
 * intervalos en segundo plano: al volver, basta con reevaluar esta función
 * con la hora actual para saber exactamente dónde debería estar la sesión,
 * sin arrastrar el error acumulado de los ticks perdidos.
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

export interface RuntimeStateFinished {
  status: "finished";
}

export type RuntimeState = RuntimeStateRunning | RuntimeStateFinished;

export function resolveRuntimeState(
  blocks: RuntimeBlock[],
  startedAt: Date,
  now: Date,
): RuntimeState {
  let remainingElapsed = Math.max(0, (now.getTime() - startedAt.getTime()) / 1000);

  for (let index = 0; index < blocks.length; index++) {
    const duration = blocks[index]!.plannedDurationSeconds;
    if (remainingElapsed < duration) {
      return {
        status: "running",
        activeBlockIndex: index,
        elapsedInActiveBlock: remainingElapsed,
        remainingInActiveBlock: duration - remainingElapsed,
      };
    }
    remainingElapsed -= duration;
  }

  return { status: "finished" };
}
