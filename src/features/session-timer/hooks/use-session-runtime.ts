"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { resolveRuntimeState, type RuntimeBlock, type RuntimeState } from "@/core/domain/session-runtime";
import { playNotificationSound, vibrate } from "@/features/session-timer/application/sounds";
import {
  transitionBlock,
  finishSession,
  extendActiveBlock,
  pauseActiveBlock,
  resumeActiveBlock,
  insertSessionBlock,
  reorderSessionBlocks,
  removeSessionBlock,
} from "@/features/session-timer/application/actions";
import type { SoundChoice } from "@/core/domain/user-settings";
import type { SessionBlockStatus } from "@/core/domain/session";

export interface RuntimeBlockInput extends RuntimeBlock {
  name: string;
  color: string;
  categoryId: string;
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
  const t = useTranslations("SessionRunner");
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
  // Sigue en true entre el momento en que se confirma la última fase (la UI
  // ya pasa a "finished" al instante) y el momento en que finishSession
  // termina de marcar la sesión como completada en la BD — si el usuario
  // navega a Inicio antes de eso, vería la sesión como "en curso" hasta que
  // se recargara. Ver el botón "Volver al inicio" del resumen.
  const [finishing, setFinishing] = useState(false);
  // Mientras está pausado, congelamos el "now" que ve resolveRuntimeState en
  // el instante de la pausa en vez de dejarlo avanzar con el reloj real.
  const [pausedAt, setPausedAt] = useState<Date | null>(initial.pausedAt);
  // Las mutaciones de abajo (pausar, reanudar, confirmar fase, pedir tiempo,
  // reordenar) ya actualizaron la UI de forma optimista antes de llamar al
  // servidor — si la llamada falla, este mensaje es la única señal visible
  // de que el estado local puede haberse desincronizado del guardado.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // El usuario ha pulsado "terminar fase ahora" antes de que se agote el
  // tiempo — a diferencia de una pausa, esto no es reversible con "reanudar":
  // fuerza el estado a "awaiting-confirmation" (con la hora exacta del click,
  // no la de cuando se confirme después) para que pase por la misma pantalla
  // de fin de fase que un final por tiempo agotado, con su botón de "Añadir
  // fase" incluido — antes saltaba directo a la siguiente fase sin pasar por
  // ahí. Se limpia al confirmar la fase o al pedir más tiempo (ver
  // confirmNextPhase/addExtraTime).
  const [forcedCompletionAt, setForcedCompletionAt] = useState<Date | null>(null);
  // Fases añadidas a mitad de sesión (ver addBlock) se insertan aquí, no en
  // la prop `blocks` original (fija desde que se montó el componente) — todo
  // lo demás (nextBlock, activeBlockIndex+1, la cola de "pendientes" para el
  // selector de posición…) se deriva de este array por índice, así que una
  // fase nueva encaja sola sin más casos especiales.
  const [dynamicBlocks, setDynamicBlocks] = useState(blocks);
  const effectiveBlocks =
    Object.keys(extraSecondsByBlockId).length === 0
      ? dynamicBlocks
      : dynamicBlocks.map((block) =>
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
  const runtimeState: RuntimeState = forcedCompletionAt
    ? { status: "awaiting-confirmation", activeBlockIndex }
    : resolveRuntimeState(effectiveBlocks, activeBlockIndex, activeBlockStartedAt, effectiveNow);
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

  function confirmNextPhase() {
    if (isTransitioningRef.current || runtimeState.status === "finished") return;
    const completedBlock = activeBlock;
    if (!completedBlock) return;

    isTransitioningRef.current = true;
    const clickedAt = new Date();
    // La fase "terminó" en el instante en que se agotó su tiempo, se pausó o
    // se forzó su fin con "terminar fase ahora" — nunca en el momento en que
    // por fin se confirma, que puede llegar mucho después si se deja la
    // pantalla de fin de fase abierta sin tocarla; si no, esa espera contaría
    // como tiempo practicado (y, al reutilizarse como inicio de la siguiente
    // fase, también le robaría tiempo a esa).
    const naturalEndAt = new Date(
      activeBlockStartedAt.getTime() + completedBlock.plannedDurationSeconds * 1000,
    );
    const completedAt = forcedCompletionAt ?? pausedAt ?? naturalEndAt;
    setForcedCompletionAt(null);
    setPausedAt(null);
    const actualDurationSeconds = Math.round(
      (completedAt.getTime() - activeBlockStartedAt.getTime()) / 1000,
    );

    setLastCompletedBlock(completedBlock);
    setCompletedDurations((prev) => ({ ...prev, [completedBlock.id]: actualDurationSeconds }));

    const transition = transitionBlock({
      sessionId,
      completedBlocks: [{ id: completedBlock.id, actualDurationSeconds }],
      completedAt: completedAt.toISOString(),
      nextBlockId: nextBlock?.id ?? null,
      nextBlockPlannedDurationSeconds: nextBlock?.plannedDurationSeconds,
      nextStartedAt: clickedAt.toISOString(),
    }).catch((error: unknown) => {
      console.error("No se pudo guardar la transición de bloque", error);
      setErrorMessage(t("transitionError"));
    });

    setActiveBlockIndex(activeBlockIndex + 1);
    setActiveBlockStartedAt(clickedAt);
    if (nextBlock) {
      isTransitioningRef.current = false;
    } else {
      // Encadenado, no en paralelo con transitionBlock: finishSession suma
      // actual_duration_seconds tal cual está en BD en ese momento — si se
      // lanzara a la vez, podría leer el bloque justo cerrado todavía con su
      // valor por defecto (0) y guardar un total corto.
      setFinishing(true);
      void transition
        .then(() => finishSession(sessionId, null))
        .catch((error: unknown) => {
          console.error("No se pudo finalizar la sesión", error);
          setErrorMessage(t("transitionError"));
        })
        .finally(() => setFinishing(false));
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
    // Si el fin de fase fue forzado ("terminar fase ahora"), pedir más tiempo
    // significa que el usuario se ha arrepentido — se libera para que vuelva
    // a mandar el estado el cronómetro real (ahora con el plazo ampliado),
    // en vez de quedarse fijo en "awaiting-confirmation" para siempre.
    setForcedCompletionAt(null);
    // Para que vuelva a sonar/vibrar cuando se agote también el tiempo extra.
    announcedIndexRef.current = null;
    void extendActiveBlock(sessionId, blockId, seconds).catch((error: unknown) => {
      console.error("No se pudo ampliar el tiempo de la fase", error);
      setErrorMessage(t("extendError"));
    });
  }

  /** Cierra la fase activa antes de que se agote su tiempo — a diferencia de
   * antes, ya no confirma el paso a la siguiente fase directamente: fuerza el
   * mismo estado "awaiting-confirmation" que un final por tiempo agotado, así
   * el usuario pasa por la pantalla de fin de fase (con su opción de "Añadir
   * fase") en vez de saltársela. */
  function finishPhaseNow() {
    if (runtimeState.status !== "running" || !activeBlock) return;
    setForcedCompletionAt(pausedAt ?? new Date());
  }

  /** Congela el cronómetro: el bloque activo sigue "running" pero con el
   * tiempo detenido en el instante de la pausa, se cancela el aviso de fin
   * de fase para que no llegue mientras está parado, y se guarda cuánto
   * quedaba — así la pausa se puede reconstruir aunque se cierre la pestaña
   * o se vuelva a Inicio antes de reanudar (ver el useState de `initial`). */
  function pauseTimer() {
    if (runtimeState.status !== "running" || pausedAt || !activeBlock) return;
    setPausedAt(new Date());
    void pauseActiveBlock(sessionId, activeBlock.id, runtimeState.remainingInActiveBlock).catch(
      (error: unknown) => {
        console.error("No se pudo pausar la fase", error);
        setErrorMessage(t("pauseError"));
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
    void resumeActiveBlock(sessionId, activeBlock.id, newStartedAt.toISOString(), remainingSeconds).catch(
      (error: unknown) => {
        console.error("No se pudo reanudar la fase", error);
        setErrorMessage(t("resumeError"));
      },
    );
  }

  /** Añade una fase nueva entre las que quedan por hacer — se llama desde la
   * pantalla de fin de fase (ver PhaseCompleteCard/AddPhaseDialog).
   * `beforeBlockId: null` la deja al final de la cola; si no había ninguna
   * fase pendiente (estabas en la última), esta pasa a ser `nextBlock` sola,
   * y el botón de "siguiente fase" que ya existe sirve para empezarla. */
  async function addBlock(input: {
    categoryId: string;
    name: string;
    color: string;
    plannedDurationSeconds: number;
    beforeBlockId: string | null;
  }) {
    const created = await insertSessionBlock(sessionId, input);
    const runtimeBlock: RuntimeBlockInput = {
      id: created.id,
      name: created.name,
      color: created.color,
      categoryId: created.categoryId,
      plannedDurationSeconds: created.plannedDurationSeconds,
      actualDurationSeconds: 0,
      note: null,
      status: "pending",
      startedAt: null,
      pausedRemainingSeconds: null,
    };
    setDynamicBlocks((prev) => {
      const insertAt = input.beforeBlockId
        ? prev.findIndex((block) => block.id === input.beforeBlockId)
        : -1;
      const index = insertAt === -1 ? prev.length : insertAt;
      return [...prev.slice(0, index), runtimeBlock, ...prev.slice(index)];
    });
  }

  /** Reordena la cola de fases pendientes arrastrando (ver PhaseCompleteCard/
   * RemainingPhasesList) — mismo patrón que la lista de bloques de la
   * pantalla de inicio: se añade siempre al final y luego se arrastra a su
   * sitio, en vez de elegir la posición en un desplegable al crearla. */
  function reorderBlocks(orderedBlockIds: string[]) {
    setDynamicBlocks((prev) => {
      const byId = new Map(prev.map((block) => [block.id, block] as const));
      const reorderedTail = orderedBlockIds
        .map((id) => byId.get(id))
        .filter((block): block is RuntimeBlockInput => block != null);
      return [...prev.slice(0, activeBlockIndex + 1), ...reorderedTail];
    });
    void reorderSessionBlocks(sessionId, orderedBlockIds).catch((error: unknown) => {
      console.error("No se pudo reordenar las fases", error);
      setErrorMessage(t("reorderError"));
    });
  }

  /** Quita una fase pendiente (deslizar en RemainingPhasesList) — igual que
   * reorderBlocks, optimista: se quita ya de la UI y la petición va detrás. */
  function removeBlock(blockId: string) {
    setDynamicBlocks((prev) => prev.filter((block) => block.id !== blockId));
    void removeSessionBlock(sessionId, blockId).catch((error: unknown) => {
      console.error("No se pudo eliminar la fase", error);
      setErrorMessage(t("removeError"));
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
    // Fases todavía sin empezar tras la que se está confirmando ahora — para
    // el selector de "insertar antes de…" al añadir una fase nueva.
    remainingBlocks: effectiveBlocks.slice(activeBlockIndex + 1),
    remainingSeconds: runtimeState.status === "running" ? runtimeState.remainingInActiveBlock : 0,
    elapsedSeconds: runtimeState.status === "running" ? runtimeState.elapsedInActiveBlock : 0,
    lastCompletedBlock,
    completedDurations,
    finishing,
    isPaused: pausedAt !== null,
    confirmNextPhase,
    finishPhaseNow,
    addExtraTime,
    addBlock,
    reorderBlocks,
    removeBlock,
    pauseTimer,
    resumeTimer,
    errorMessage,
    dismissError: () => setErrorMessage(null),
  };
}
