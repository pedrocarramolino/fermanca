"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useSessionRuntime,
  type PlaybackSettings,
  type RuntimeBlockInput,
} from "@/features/session-timer/hooks/use-session-runtime";
import { isAudioUnlocked, unlockAudio } from "@/features/session-timer/application/sounds";
import { getFreshBlocks } from "@/features/session-timer/application/actions";
import { TimerDisplay } from "@/features/session-timer/components/timer-display";
import { PhaseCompleteCard } from "@/features/session-timer/components/phase-complete-card";
import { QuickNoteField } from "@/features/session-timer/components/quick-note-field";
import { SessionSummary } from "@/features/session-timer/components/session-summary";

export function SessionRunner({
  sessionId,
  blocks,
  playbackSettings,
}: {
  sessionId: string;
  blocks: RuntimeBlockInput[];
  playbackSettings: PlaybackSettings;
}) {
  const [audioReady, setAudioReady] = useState(false);
  const [freshBlocks, setFreshBlocks] = useState<RuntimeBlockInput[] | null>(null);

  const runtime = useSessionRuntime({ sessionId, blocks, playbackSettings });
  const noteableBlock = runtime.lastCompletedBlock;
  const finished = runtime.status === "finished";

  useEffect(() => {
    void unlockAudio().then(() => setAudioReady(isAudioUnlocked()));
  }, []);

  useEffect(() => {
    // Las notas guardadas durante la sesión (QuickNoteField) nunca tocan el
    // estado local `blocks`: al terminar, releemos de la BD para que el
    // resumen las muestre sin esperar a una recarga de página.
    if (finished) {
      void getFreshBlocks(sessionId).then((result) =>
        setFreshBlocks(result.map((block) => ({ ...block, status: "completed", startedAt: null }))),
      );
    }
  }, [finished, sessionId]);

  function handleUnlockAudio() {
    void unlockAudio().then(() => setAudioReady(isAudioUnlocked()));
  }

  if (finished) {
    // El runtime ya conoce la duración real de cada bloque cerrado (se
    // calculó localmente al confirmar cada fase) — se superpone sobre
    // freshBlocks/blocks para no depender de que ese refetch haya llegado
    // ya, ni de lo que traiga la prop `blocks` original (nunca se actualiza
    // sola al confirmar una fase).
    const summaryBlocks = (freshBlocks ?? blocks).map((block) =>
      runtime.completedDurations[block.id] != null
        ? { ...block, actualDurationSeconds: runtime.completedDurations[block.id]! }
        : block,
    );
    return <SessionSummary sessionId={sessionId} blocks={summaryBlocks} />;
  }

  if (!runtime.activeBlock) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-8 p-8">
      {runtime.status === "awaiting-confirmation" ? (
        <PhaseCompleteCard
          completedBlock={runtime.activeBlock}
          nextBlock={runtime.nextBlock}
          onConfirm={runtime.confirmNextPhase}
          onAddTime={runtime.addExtraTime}
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <TimerDisplay
            blockName={runtime.activeBlock.name}
            color={runtime.activeBlock.color}
            remainingSeconds={runtime.remainingSeconds}
            nextBlockName={runtime.nextBlock?.name ?? null}
            isPaused={runtime.isPaused}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runtime.isPaused ? runtime.resumeTimer : runtime.pauseTimer}
            >
              {runtime.isPaused ? "Reanudar" : "Pausar"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={runtime.confirmNextPhase}>
              Terminar fase ahora
            </Button>
          </div>
        </div>
      )}

      {noteableBlock && (
        <QuickNoteField
          key={noteableBlock.id}
          blockId={noteableBlock.id}
          blockName={noteableBlock.name}
        />
      )}

      {!audioReady && (
        <Button type="button" variant="outline" size="sm" onClick={handleUnlockAudio}>
          Activar sonido
        </Button>
      )}
    </main>
  );
}
