"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/core/infrastructure/supabase/client";
import { getFreshBlocks } from "@/features/session-timer/application/actions";
import { SessionRunner } from "@/features/session-timer/components/session-runner";
import {
  CoopNoticeToast,
  type CoopNotice,
} from "@/features/session-timer/components/coop-notice-toast";
import type {
  PlaybackSettings,
  RuntimeBlockInput,
} from "@/features/session-timer/hooks/use-session-runtime";
import type { SessionEventType } from "@/core/domain/session-event";

/**
 * Envoltorio de SessionRunner solo para sesiones cooperativas — se
 * suscribe por Realtime a la propia sesión y, ante cualquier cambio,
 * vuelve a leer los bloques y remonta SessionRunner con `key={revision}`
 * (mismo patrón de "remontar para resincronizar" que ya usa el resto de la
 * app, p. ej. FriendSessionContent) en vez de intentar parchear el estado
 * en marcha de useSessionRuntime. Toda mutación del cronómetro, la haga
 * quien la haga, siempre se replica en AMBAS sesiones gemelas (ver
 * coop-mirror.ts), así que basta con escuchar la propia fila para enterarse
 * también de lo que hace el compañero.
 */
export function CoopSessionRunner({
  sessionId,
  initialBlocks,
  playbackSettings,
  peerUsername,
  userId,
}: {
  sessionId: string;
  initialBlocks: RuntimeBlockInput[];
  playbackSettings: PlaybackSettings;
  peerUsername: string;
  userId: string;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [revision, setRevision] = useState(0);
  const [notices, setNotices] = useState<CoopNotice[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`coop-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_blocks",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void getFreshBlocks(sessionId).then((fresh) => {
            setBlocks(fresh);
            setRevision((r) => r + 1);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as { status: string };
          // La propia página server ya sabe cambiar entre SessionRunner y
          // SessionSummary según session.status — no hace falta duplicar
          // esa lógica aquí, solo pedirle que vuelva a renderizar.
          if (row.status !== "in_progress") router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            actor_id: string;
            actor_username: string;
            type: SessionEventType;
          };
          // El evento que yo mismo acabo de generar también llega por este
          // canal (se inserta en las dos sesiones) — solo interesa el del
          // compañero.
          if (row.actor_id === userId) return;
          setNotices((prev) => [
            ...prev,
            { id: row.id, type: row.type, actorUsername: row.actor_username },
          ]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, userId, router]);

  function dismissNotice(id: string) {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
  }

  return (
    <>
      <SessionRunner
        key={revision}
        sessionId={sessionId}
        blocks={blocks}
        playbackSettings={playbackSettings}
        peerUsername={peerUsername}
      />
      <CoopNoticeToast notices={notices} onDismiss={dismissNotice} />
    </>
  );
}
