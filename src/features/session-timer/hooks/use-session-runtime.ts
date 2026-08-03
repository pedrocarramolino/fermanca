"use client";

import { useEffect, useRef, useState } from "react";
import { resolveRuntimeState, type RuntimeBlock } from "@/core/domain/session-runtime";
import { playNotificationSound, vibrate } from "@/features/session-timer/application/sounds";
import {
  transitionBlock,
  finishSession,
  markPhaseAlertSent,
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

/** `actions` es válido en `ServiceWorkerRegistration.showNotification()` pero
 * lib.dom.d.ts no lo modela en `NotificationOptions` (solo aplica ahí, no al
 * constructor `new Notification()`). */
interface ShowNotificationOptions extends NotificationOptions {
  actions?: { action: string; title: string }[];
}

function findActiveIndex(blocks: RuntimeBlockInput[]): number {
  const index = blocks.findIndex((b) => b.status === "active");
  return index === -1 ? 0 : index;
}

export function useSessionRuntime({
  sessionId,
  blocks,
  playbackSettings,
  notificationsEnabled,
}: {
  sessionId: string;
  blocks: RuntimeBlockInput[];
  playbackSettings: PlaybackSettings;
  notificationsEnabled: boolean;
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

  // Evita volver a sonar/vibrar/notificar al recargar la página sobre un
  // bloque que ya estaba esperando confirmación desde antes.
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

  const runtimeState = resolveRuntimeState(blocks, activeBlockIndex, activeBlockStartedAt, now);
  const activeBlock = blocks[activeBlockIndex] ?? null;
  const nextBlock = blocks[activeBlockIndex + 1] ?? null;
  const awaitingConfirmationIndex =
    runtimeState.status === "awaiting-confirmation" ? runtimeState.activeBlockIndex : -1;

  function announcePhaseComplete() {
    playNotificationSound(
      playbackSettings.sound,
      playbackSettings.volume,
      playbackSettings.visualAlertDurationMs,
    );
    vibrate(playbackSettings.vibrationEnabled);

    if (notificationsEnabled && document.hidden && "serviceWorker" in navigator) {
      const options: ShowNotificationOptions = {
        body: nextBlock ? `Toca para pasar a "${nextBlock.name}".` : "Sesión completada.",
        tag: "practiceflow-session-phase",
        data: { type: "session-phase", sessionId, url: `/session/${sessionId}` },
        actions: nextBlock ? [{ action: "next-phase", title: "Siguiente fase" }] : undefined,
      };
      void navigator.serviceWorker.ready.then((registration) =>
        registration.showNotification("Fase completada", options),
      );
      // El cron de push (/api/cron/session-phases) es la red de seguridad
      // para cuando el móvil está bloqueado y este código nunca llega a
      // ejecutarse; si SÍ se ejecuta, avisamos al servidor para que el cron
      // no vuelva a enviar el mismo aviso por su cuenta.
      if (activeBlock) void markPhaseAlertSent(activeBlock.id);
    }
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

  function confirmNextPhase() {
    if (isTransitioningRef.current || runtimeState.status !== "awaiting-confirmation") return;
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
  };
}
