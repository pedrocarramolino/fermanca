import { notFound } from "next/navigation";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import type { SessionId, UserId } from "@/core/domain/ids";
import { SessionRunner } from "@/features/session-timer/components/session-runner";
import { SessionSummary } from "@/features/session-timer/components/session-summary";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId;

  const sessionRepo = new SupabaseSessionRepository(supabase);
  const session = await sessionRepo.getById(id as SessionId, userId);
  if (!session) notFound();

  const runtimeBlocks: RuntimeBlockInput[] = session.blocks.map((block) => ({
    id: block.id,
    name: block.name,
    color: block.color,
    plannedDurationSeconds: block.plannedDurationSeconds,
    actualDurationSeconds: block.actualDurationSeconds,
    note: block.note,
    status: block.status,
    startedAt: block.startedAt?.toISOString() ?? null,
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

  const settingsRepo = new SupabaseUserSettingsRepository(supabase);
  const settings = await settingsRepo.get(userId);

  return (
    <SessionRunner
      sessionId={session.id}
      blocks={runtimeBlocks}
      playbackSettings={{
        sound: settings.sound,
        volume: settings.volume,
        vibrationEnabled: settings.vibrationEnabled,
        visualAlertDurationMs: settings.visualAlertDurationMs,
      }}
    />
  );
}
