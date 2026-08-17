import { notFound } from "next/navigation";
import {
  getAuthenticatedUser,
  getCurrentUserSettings,
} from "@/core/infrastructure/supabase/current-user";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import type { SessionId } from "@/core/domain/ids";
import { SessionRunner } from "@/features/session-timer/components/session-runner";
import { CoopSessionRunner } from "@/features/session-timer/components/coop-session-runner";
import { SessionSummary } from "@/features/session-timer/components/session-summary";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await getAuthenticatedUser();

  const sessionRepo = new SupabaseSessionRepository(supabase);
  // En paralelo, no en cascada: los ajustes no dependen de la sesión, y si
  // el layout raíz ya los pidió (getCurrentUserSettings está cacheada por
  // petición), esto ni siquiera vuelve a consultar la base de datos.
  const [session, settings] = await Promise.all([
    sessionRepo.getById(id as SessionId, userId),
    getCurrentUserSettings(),
  ]);
  if (!session) notFound();

  const runtimeBlocks: RuntimeBlockInput[] = session.blocks.map((block) => ({
    id: block.id,
    name: block.name,
    color: block.color,
    categoryId: block.categoryId,
    plannedDurationSeconds: block.plannedDurationSeconds,
    actualDurationSeconds: block.actualDurationSeconds,
    note: block.note,
    status: block.status,
    startedAt: block.startedAt?.toISOString() ?? null,
    pausedRemainingSeconds: block.pausedRemainingSeconds,
  }));

  if (session.status !== "in_progress") {
    return (
      <SessionSummary
        sessionId={session.id}
        blocks={runtimeBlocks}
        initialFinalNote={session.finalNote ?? ""}
      />
    );
  }

  const playbackSettings = {
    sound: settings.sound,
    volume: settings.volume,
    vibrationEnabled: settings.vibrationEnabled,
    visualAlertDurationMs: settings.visualAlertDurationMs,
  };

  if (session.linkedSessionId) {
    return (
      <CoopSessionRunner
        sessionId={session.id}
        initialBlocks={runtimeBlocks}
        playbackSettings={playbackSettings}
        peerUsername={session.linkedSessionPeerUsername ?? ""}
        userId={userId}
      />
    );
  }

  return (
    <SessionRunner sessionId={session.id} blocks={runtimeBlocks} playbackSettings={playbackSettings} />
  );
}
