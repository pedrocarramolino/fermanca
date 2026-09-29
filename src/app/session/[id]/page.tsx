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

  // La hora a la que el servidor pinta el cronómetro: el primer pintado del
  // navegador usa esta misma para que el tiempo restante salga idéntico y
  // React no dé el error de hidratación #418 (ver useSessionRuntime). Es
  // un Server Component: se pinta una vez por petición, no se "re-renderiza".
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now();

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
        renderedAt={renderedAt}
      />
    );
  }

  return (
    <SessionRunner
      sessionId={session.id}
      blocks={runtimeBlocks}
      playbackSettings={playbackSettings}
      renderedAt={renderedAt}
    />
  );
}
