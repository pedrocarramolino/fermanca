"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useSessionRuntime,
  type PlaybackSettings,
  type RuntimeBlockInput,
} from "@/features/session-timer/hooks/use-session-runtime";
import { useNotificationPermission } from "@/features/session-timer/hooks/use-notification-permission";
import { isAudioUnlocked, unlockAudio } from "@/features/session-timer/application/sounds";
import { getFreshBlocks } from "@/features/session-timer/application/actions";
import { TimerDisplay } from "@/features/session-timer/components/timer-display";
import { BlockTransitionOverlay } from "@/features/session-timer/components/block-transition-overlay";
import { QuickNoteField } from "@/features/session-timer/components/quick-note-field";
import { SessionSummary } from "@/features/session-timer/components/session-summary";

export function SessionRunner({
  sessionId,
  startedAt,
  blocks,
  playbackSettings,
}: {
  sessionId: string;
  startedAt: string;
  blocks: RuntimeBlockInput[];
  playbackSettings: PlaybackSettings;
}) {
  const { permission, request: requestNotifications } = useNotificationPermission();
  const [audioReady, setAudioReady] = useState(false);
  const [freshBlocks, setFreshBlocks] = useState<RuntimeBlockInput[] | null>(null);

  const runtime = useSessionRuntime({
    sessionId,
    startedAt: new Date(startedAt),
    blocks,
    playbackSettings,
    notificationsEnabled: permission === "granted",
  });
  const noteableBlock = runtime.lastCompletedBlock;

  useEffect(() => {
    void unlockAudio().then(() => setAudioReady(isAudioUnlocked()));
  }, []);

  useEffect(() => {
    // Las notas guardadas durante la sesión (QuickNoteField) nunca tocan el
    // estado local `blocks`: al terminar, releemos de la BD para que el
    // resumen las muestre sin esperar a una recarga de página.
    if (runtime.finished) {
      void getFreshBlocks(sessionId).then((result) =>
        setFreshBlocks(result.map((block) => ({ ...block, alreadyCompleted: true }))),
      );
    }
  }, [runtime.finished, sessionId]);

  function handleUnlockAudio() {
    void unlockAudio().then(() => setAudioReady(isAudioUnlocked()));
  }

  if (runtime.finished) {
    return <SessionSummary sessionId={sessionId} blocks={freshBlocks ?? blocks} />;
  }

  if (!runtime.activeBlock) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-8 p-8">
      <TimerDisplay
        blockName={runtime.activeBlock.name}
        color={runtime.activeBlock.color}
        remainingSeconds={runtime.remainingSeconds}
        nextBlockName={runtime.nextBlock?.name ?? null}
      />

      {noteableBlock && (
        <QuickNoteField
          key={noteableBlock.id}
          blockId={noteableBlock.id}
          blockName={noteableBlock.name}
        />
      )}

      {permission === "default" && (
        <Button type="button" variant="outline" size="sm" onClick={requestNotifications}>
          Activar avisos aunque cambie de pestaña
        </Button>
      )}

      {!audioReady && (
        <Button type="button" variant="outline" size="sm" onClick={handleUnlockAudio}>
          Activar sonido
        </Button>
      )}

      <BlockTransitionOverlay transition={runtime.transition} />
    </main>
  );
}
