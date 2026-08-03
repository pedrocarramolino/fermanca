"use client";

import { useEffect, useRef, useState } from "react";
import { resolveRuntimeState, type RuntimeBlock } from "@/core/domain/session-runtime";
import { playNotificationSound, vibrate } from "@/features/session-timer/application/sounds";
import { transitionBlock, finishSession } from "@/features/session-timer/application/actions";
import type { SoundChoice } from "@/core/domain/user-settings";

export interface RuntimeBlockInput extends RuntimeBlock {
  name: string;
  color: string;
  actualDurationSeconds: number;
  note: string | null;
  /** true si ya estaba 'completed' en la BD al cargar la página (recarga a mitad de sesión). */
  alreadyCompleted: boolean;
}

export interface TransitionInfo {
  completedBlock: RuntimeBlockInput | null;
  nextBlock: RuntimeBlockInput | null;
}

export interface PlaybackSettings {
  sound: SoundChoice;
  volume: number;
  vibrationEnabled: boolean;
  visualAlertDurationMs: number;
}

const TICK_MS = 250;

export function useSessionRuntime({
  sessionId,
  startedAt,
  blocks,
  playbackSettings,
  notificationsEnabled,
}: {
  sessionId: string;
  startedAt: Date;
  blocks: RuntimeBlockInput[];
  playbackSettings: PlaybackSettings;
  notificationsEnabled: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const [transition, setTransition] = useState<TransitionInfo | null>(null);
  const [lastCompletedBlock, setLastCompletedBlock] = useState<RuntimeBlockInput | null>(null);
  const [finished, setFinished] = useState(false);

  const initiallyCompleted = blocks.filter((b) => b.alreadyCompleted).length;
  /** Índice del último bloque ya marcado 'active' en la BD; -1 = ninguno todavía. */
  const lastActiveIndexRef = useRef(initiallyCompleted === 0 ? -1 : initiallyCompleted - 1);
  const finishedHandledRef = useRef(false);

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

  const runtimeState = resolveRuntimeState(blocks, startedAt, now);

  /** Todo lo que quedó atrás desde el último punto conocido hasta `upToExclusive`. */
  function collectSkippedBlocks(upToExclusive: number): RuntimeBlockInput[] {
    const startIndex = lastActiveIndexRef.current === -1 ? 0 : lastActiveIndexRef.current;
    return blocks.slice(startIndex, upToExclusive);
  }

  function persistTransition(
    completedBlocks: RuntimeBlockInput[],
    nextBlock: RuntimeBlockInput | null,
  ) {
    return transitionBlock({
      completedBlocks: completedBlocks.map((block) => ({
        id: block.id,
        actualDurationSeconds: block.plannedDurationSeconds,
      })),
      nextBlockId: nextBlock?.id ?? null,
      now: new Date().toISOString(),
    }).catch((error: unknown) => {
      console.error("No se pudo guardar la transición de bloque", error);
    });
  }

  function announceTransition(
    completedBlock: RuntimeBlockInput | null,
    nextBlock: RuntimeBlockInput | null,
  ) {
    playNotificationSound(playbackSettings.sound, playbackSettings.volume);
    vibrate(playbackSettings.vibrationEnabled);
    setTransition({ completedBlock, nextBlock });
    setLastCompletedBlock(completedBlock);
    window.setTimeout(() => setTransition(null), playbackSettings.visualAlertDurationMs);

    if (notificationsEnabled && document.hidden && "Notification" in window) {
      new Notification(nextBlock ? `Siguiente: ${nextBlock.name}` : "Sesión completada", {
        body: completedBlock ? `${completedBlock.name} terminado` : undefined,
        tag: "practiceflow-block-transition",
      });
    }
  }

  useEffect(() => {
    if (runtimeState.status === "running") {
      if (runtimeState.activeBlockIndex > lastActiveIndexRef.current) {
        const skipped = collectSkippedBlocks(runtimeState.activeBlockIndex);
        const nextBlock = blocks[runtimeState.activeBlockIndex] ?? null;
        lastActiveIndexRef.current = runtimeState.activeBlockIndex;
        announceTransition(skipped.at(-1) ?? null, nextBlock);
        void persistTransition(skipped, nextBlock);
      }
      return;
    }

    // status === "finished"
    if (!finishedHandledRef.current) {
      finishedHandledRef.current = true;
      const skipped = collectSkippedBlocks(blocks.length);
      if (skipped.length > 0) {
        // Efecto deliberado: anuncia (sonido/aviso/notificación) la última
        // transición real detectada al recalcular el estado a partir del
        // reloj — no hay ningún sistema externo distinto que sincronizar.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        announceTransition(skipped.at(-1) ?? null, null);
        void persistTransition(skipped, null);
      }
      lastActiveIndexRef.current = blocks.length;
      setFinished(true);
      void finishSession(sessionId, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeState.status, runtimeState.status === "running" ? runtimeState.activeBlockIndex : -1]);

  const activeBlock =
    runtimeState.status === "running" ? (blocks[runtimeState.activeBlockIndex] ?? null) : null;
  const nextBlock =
    runtimeState.status === "running" ? (blocks[runtimeState.activeBlockIndex + 1] ?? null) : null;

  return {
    status: runtimeState.status,
    finished,
    activeBlock,
    nextBlock,
    remainingSeconds: runtimeState.status === "running" ? runtimeState.remainingInActiveBlock : 0,
    elapsedSeconds: runtimeState.status === "running" ? runtimeState.elapsedInActiveBlock : 0,
    activeBlockIndex:
      runtimeState.status === "running" ? runtimeState.activeBlockIndex : blocks.length,
    transition,
    lastCompletedBlock,
  };
}
