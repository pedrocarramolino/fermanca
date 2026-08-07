"use client";

import { useEffect, useRef, useState } from "react";
import { resolveRuntimeState, type RuntimeBlock } from "@/core/domain/session-runtime";
import { playNotificationSound, vibrate } from "@/features/session-timer/application/sounds";
import {
  transitionBlock,
  finishSession,
  extendActiveBlock,
  pauseActiveBlock,
  resumeActiveBlock,
} from "@/features/session-timer/application/actions";
import type { SoundChoice } from "@/core/domain/user-settings";
import type { SessionBlockStatus } from "@/core/domain/session";

export interface RuntimeBlockInput extends RuntimeBlock {
  name: string;
  color: string;
  actualDurationSeconds: number;
  note: string | null;
  status: SessionBlockStatus;
  /** ISO — null si el bloque todavía no ha empezado a contar. */
  startedAt: string | null;
  /** Cuánto quedaba cuando se pausó — null si no está en pausa. Permite
   * reconstruir una pausa que sobrevivió a recargar la página o a volver
   * más tarde desde Inicio (ver el useState de `initial` más abajo). */
  pausedRemainingSeconds: number | null;
}

export interface PlaybackSettings {
  sound: SoundChoice;
  volume: number;
  vibrationEnabled: boolean;
  visualAlertDurationMs: number;
}

const TICK_MS = 250;

function findActiveIndex(blocks: RuntimeBlockInput[]): number {
  const index = blocks.findIndex((b) => b.status === "active");
  return index === -1 ? 0 : index;
}

export function useSessionRuntime({
  sessionId,
  blocks,
  playbackSettings,
}: {
  sessionId: string;
  blocks: RuntimeBlockInput[];
  playbackSettings: PlaybackSettings;
}) {
  const [initial] = useState(() => {
    const index = findActiveIndex(blocks);
    const block = blocks[index];
    const nowAtMount = new Date();

    // Estaba en pausa la última vez que se guardó (pauseTimer persiste esto
    // — ver la acción pauseActiveBlock): se reconstruye "congelada" con el
    // mismo tiempo restante, en vez de recalcular desde started_at, que no
    // se movió mientras estuvo en pausa. Así una pausa sobrevive a recargar
    // la página o a volver más tarde desde Inicio.
    if (block?.pausedRemainingSeconds != null) {
      const elapsedSeconds = Math.max(0, block.plannedDurationSeconds - block.pausedRemainingSeconds);
      const startedAt = new Date(nowAtMount.getTime() - elapsedSeconds * 1000);
      return { index, startedAt, alreadyAwaiting: false, pausedAt: nowAtMount };
    }

    const startedAt = block?.startedAt ? new Date(block.startedAt) : nowAtMount;
    const state = resolveRuntimeState(blocks, index, startedAt, nowAtMount);
    return {
      index,
      startedAt,
      alreadyAwaiting: state.status === "awaiting-confirmation",
      pausedAt: null as Date | null,
    };
  });

  const [now, setNow] = useState(() => new Date());
  const [activeBlockIndex, setActiveBlockIndex] = useState(initial.index);
  const [activeBlockStartedAt, setActiveBlockStartedAt] = useState(initial.startedAt);
  const [lastCompletedBlock, setLastCompletedBlock] = useState<RuntimeBlockInput | null>(null);
  // Duración real de cada bloque ya cerrado, por id — el resumen final la usa
  // directamente en vez de fiarse de un refetch (que puede llegar antes de
  // que transitionBlock termine de guardar) o de la prop `blocks` original
  // (que nunca se actualiza localmente al confirmar una fase).
  const [completedDurations, setCompletedDurations] = useState<Record<string, number>>({});
  // Tiempo extra pedido al terminar una fase, por id de bloque — se suma a
  // plannedDurationSeconds solo para el cálculo de este runtime, la duración
  // "de verdad" del bloque no cambia hasta que el servidor confirma.
  const [extraSecondsByBlockId, setExtraSecondsByBlockId] = useState<Record<string, number>>({});
  // Mientras está pausado, congelamos el "now" que ve resolveRuntimeState en
  // el instante de la pausa en vez de dejarlo avanzar con el reloj real.
  const [pausedAt, setPausedAt] = useState<Date | null>(initial.pausedAt);
  const effectiveBlocks =
    Object.keys(extraSecondsByBlockId).length === 0
      ? blocks
      : blocks.map((block) =>
          extraSecondsByBlockId[block.id]
            ? {
                ...block,
                plannedDurationSeconds:
                  block.plannedDurationSeconds + extraSecondsByBlockId[block.id]!,
              }
            : block,
        );

  // Evita volver a sonar/vibrar al recargar la página sobre un bloque que ya
  // estaba esperando confirmación desde antes.
  const announcedIndexRef = useRef<number | null>(initial.alreadyAwaiting ? initial.index : null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    const onVisible = () => setNow(new Date());
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const effectiveNow = pausedAt ?? now;
  const runtimeState = resolveRuntimeState(
    effectiveBlocks,
    activeBlockIndex,
    activeBlockStartedAt,
    effectiveNow,
  );
  const activeBlock = effectiveBlocks[activeBlockIndex] ?? null;
  const nextBlock = effectiveBlocks[activeBlockIndex + 1] ?? null;
  const awaitingConfirmationIndex =
    runtimeState.status === "awaiting-confirmation" ? runtimeState.activeBlockIndex : -1;

  // La notificación del sistema la manda siempre QStash (ver
  // /api/qstash/session-phase-alert), aunque la pestaña esté abierta y en
  // primer plano — aquí solo se da la señal audible/háptica local.
  function announcePhaseComplete() {
    playNotificationSound(
      playbackSettings.sound,
      playbackSettings.volume,
      playbackSettings.visualAlertDurationMs,
    );
    vibrate(playbackSettings.vibrationEnabled);
  }

  useEffect(() => {
    if (
      runtimeState.status === "awaiting-confirmation" &&
      announcedIndexRef.current !== runtimeState.activeBlockIndex
    ) {
      announcedIndexRef.current = runtimeState.activeBlockIndex;
      announcePhaseComplete();
    }
    // announcePhaseComplete se recrea cada render (depende de nextBlock,
    // sessionId, ajustes de sonido); incluirla dispararía el efecto en cada
    // render en vez de solo cuando el bloque activo realmente cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeState.status, awaitingConfirmationIndex]);

  /** También se puede llamar con el bloque todavía "running" — el botón de
   * "terminar fase ahora" del cronómetro deja que el usuario cierre la fase
   * antes de que se agote el tiempo, sin esperar a la pantalla de
   * confirmación. */
  function confirmNextPhase() {
    if (isTransitioningRef.current || runtimeState.status === "finished") return;
    const completedBlock = activeBlock;
    if (!completedBlock) return;

    isTransitioningRef.current = true;
    // Si estaba en pausa, la fase "terminó" en el instante en que se pausó,
    // no ahora — si no, el tiempo en pausa contaría como practicado.
    const confirmedAt = pausedAt ?? new Date();
    setPausedAt(null);
    const actualDurationSeconds = Math.round(
      (confirmedAt.getTime() - activeBlockStartedAt.getTime()) / 1000,
    );

    setLastCompletedBlock(completedBlock);
    setCompletedDurations((prev) => ({ ...prev, [completedBlock.id]: actualDurationSeconds }));

    const transition = transitionBlock({
      completedBlocks: [{ id: completedBlock.id, actualDurationSeconds }],
      nextBlockId: nextBlock?.id ?? null,
      nextBlockPlannedDurationSeconds: nextBlock?.plannedDurationSeconds,
      now: confirmedAt.toISOString(),
    }).catch((error: unknown) => {
      console.error("No se pudo guardar la transición de bloque", error);
    });

    setActiveBlockIndex(activeBlockIndex + 1);
    setActiveBlockStartedAt(confirmedAt);
    if (nextBlock) {
      isTransitioningRef.current = false;
    } else {
      // Encadenado, no en paralelo con transitionBlock: finishSession suma
      // actual_duration_seconds tal cual está en BD en ese momento — si se
      // lanzara a la vez, podría leer el bloque justo cerrado todavía con su
      // valor por defecto (0) y guardar un total corto.
      void transition.then(() => finishSession(sessionId, null));
      // activeBlockIndex ya queda >= blocks.length, así que
      // resolveRuntimeState pasará a "finished" en el próximo tick — no
      // hace falta liberar isTransitioningRef, el runner desmonta este hook.
    }
  }

  /** El usuario pide más tiempo para la fase que acaba de terminar, en vez
   * de pasar a la siguiente — reactiva el estado "running" con el plazo
   * ampliado y reprograma el aviso QStash para el nuevo momento. */
  function addExtraTime(seconds: number) {
    if (runtimeState.status !== "awaiting-confirmation" || !activeBlock) return;
    const blockId = activeBlock.id;
    setExtraSecondsByBlockId((prev) => ({ ...prev, [blockId]: (prev[blockId] ?? 0) + seconds }));
    // Para que vuelva a sonar/vibrar cuando se agote también el tiempo extra.
    announcedIndexRef.current = null;
    void extendActiveBlock(blockId, seconds).catch((error: unknown) => {
      console.error("No se pudo ampliar el tiempo de la fase", error);
    });
  }

  /** Congela el cronómetro: el bloque activo sigue "running" pero con el
   * tiempo detenido en el instante de la pausa, se cancela el aviso de fin
   * de fase para que no llegue mientras está parado, y se guarda cuánto
   * quedaba — así la pausa se puede reconstruir aunque se cierre la pestaña
   * o se vuelva a Inicio antes de reanudar (ver el useState de `initial`). */
  function pauseTimer() {
    if (runtimeState.status !== "running" || pausedAt || !activeBlock) return;
    setPausedAt(new Date());
    void pauseActiveBlock(activeBlock.id, runtimeState.remainingInActiveBlock).catch(
      (error: unknown) => {
        console.error("No se pudo pausar la fase", error);
      },
    );
  }

  /** Desplaza activeBlockStartedAt hacia delante por lo que ha durado la
   * pausa, para que elapsed/remaining sigan contando como si ese rato no
   * hubiera pasado, y reprograma el aviso de fin de fase para lo que
   * quedaba (no para la duración completa de la fase). */
  function resumeTimer() {
    if (!pausedAt || !activeBlock) return;
    const remainingAtPause = resolveRuntimeState(
      effectiveBlocks,
      activeBlockIndex,
      activeBlockStartedAt,
      pausedAt,
    );
    const remainingSeconds =
      remainingAtPause.status === "running" ? remainingAtPause.remainingInActiveBlock : 0;

    const pauseDurationMs = Date.now() - pausedAt.getTime();
    const newStartedAt = new Date(activeBlockStartedAt.getTime() + pauseDurationMs);

    setActiveBlockStartedAt(newStartedAt);
    setPausedAt(null);
    void resumeActiveBlock(activeBlock.id, newStartedAt.toISOString(), remainingSeconds).catch(
      (error: unknown) => {
        console.error("No se pudo reanudar la fase", error);
      },
    );
  }

  const confirmNextPhaseRef = useRef(confirmNextPhase);
  useEffect(() => {
    confirmNextPhaseRef.current = confirmNextPhase;
  });

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function handleMessage(event: MessageEvent) {
      const data = event.data as { type?: string; sessionId?: string } | undefined;
      if (data?.type === "CONFIRM_NEXT_PHASE" && data.sessionId === sessionId) {
        confirmNextPhaseRef.current();
      }
    }
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [sessionId]);

  return {
    status: runtimeState.status,
    activeBlock,
    nextBlock,
    remainingSeconds: runtimeState.status === "running" ? runtimeState.remainingInActiveBlock : 0,
    elapsedSeconds: runtimeState.status === "running" ? runtimeState.elapsedInActiveBlock : 0,
    lastCompletedBlock,
    completedDurations,
    isPaused: pausedAt !== null,
    confirmNextPhase,
    addExtraTime,
    pauseTimer,
    resumeTimer,
  };
}
