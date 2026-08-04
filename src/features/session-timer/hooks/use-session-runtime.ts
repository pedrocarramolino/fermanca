"use client";

import { useEffect, useRef, useState } from "react";
import { resolveRuntimeState, type RuntimeBlock } from "@/core/domain/session-runtime";
import { playNotificationSound, vibrate } from "@/features/session-timer/application/sounds";
import {
  transitionBlock,
  finishSession,
  extendActiveBlock,
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
    const startedAt = block?.startedAt ? new Date(block.startedAt) : new Date();
    const state = resolveRuntimeState(blocks, index, startedAt, new Date());
    return { index, startedAt, alreadyAwaiting: state.status === "awaiting-confirmation" };
  });

  const [now, setNow] = useState(() => new Date());
  const [activeBlockIndex, setActiveBlockIndex] = useState(initial.index);
  const [activeBlockStartedAt, setActiveBlockStartedAt] = useState(initial.startedAt);
  const [lastCompletedBlock, setLastCompletedBlock] = useState<RuntimeBlockInput | null>(null);
  // Tiempo extra pedido al terminar una fase, por id de bloque — se suma a
  // plannedDurationSeconds solo para el cálculo de este runtime, la duración
  // "de verdad" del bloque no cambia hasta que el servidor confirma.
  const [extraSecondsByBlockId, setExtraSecondsByBlockId] = useState<Record<string, number>>({});
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

  const runtimeState = resolveRuntimeState(
    effectiveBlocks,
    activeBlockIndex,
    activeBlockStartedAt,
    now,
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
    const confirmedAt = new Date();
    const actualDurationSeconds = Math.round(
      (confirmedAt.getTime() - activeBlockStartedAt.getTime()) / 1000,
    );

    setLastCompletedBlock(completedBlock);
    void transitionBlock({
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
      void finishSession(sessionId, null);
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
    confirmNextPhase,
    addExtraTime,
  };
}
