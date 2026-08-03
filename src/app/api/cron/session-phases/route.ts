import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { isAuthorizedCronRequest } from "@/core/infrastructure/cron-auth";

/**
 * Red de seguridad para cuando el móvil está bloqueado y el JS de la página
 * (que detecta el fin de una fase mirando el reloj) nunca llega a
 * ejecutarse: revisa qué bloques activos ya deberían haber terminado
 * (`started_at + planned_duration_seconds <= ahora`) y envía el mismo aviso
 * por push real. `phase_alert_sent` evita reenviarlo en cada pasada — lo
 * pone a true tanto este cron como el propio cliente si consigue avisar él
 * mismo primero (ver markPhaseAlertSent).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: activeBlocks, error: blocksError } = await supabase
    .from("session_blocks")
    .select("id, session_id, name, position, started_at, planned_duration_seconds")
    .eq("status", "active")
    .eq("phase_alert_sent", false);
  if (blocksError) throw blocksError;

  if (activeBlocks.length === 0) {
    return NextResponse.json({ sent: 0, expired: 0, alerted: 0 });
  }

  const sessionIds = [...new Set(activeBlocks.map((b) => b.session_id))];
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, owner_id, status")
    .in("id", sessionIds)
    .eq("status", "in_progress");
  if (sessionsError) throw sessionsError;
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const now = Date.now();
  const overdueBlocks = activeBlocks.filter((block) => {
    if (!block.started_at || !sessionById.has(block.session_id)) return false;
    const dueAt = new Date(block.started_at).getTime() + block.planned_duration_seconds * 1000;
    return dueAt <= now;
  });

  if (overdueBlocks.length === 0) {
    return NextResponse.json({ sent: 0, expired: 0, alerted: 0 });
  }

  // Nombre del siguiente bloque para el cuerpo del aviso — una sola consulta
  // por todas las sesiones implicadas en vez de una por bloque.
  const { data: siblingBlocksResult, error: siblingsError } = await supabase
    .from("session_blocks")
    .select("session_id, position, name")
    .in(
      "session_id",
      overdueBlocks.map((b) => b.session_id),
    );
  if (siblingsError) throw siblingsError;
  const siblingBlocks = siblingBlocksResult ?? [];

  function nextBlockName(sessionId: string, position: number): string | null {
    return (
      siblingBlocks.find((b) => b.session_id === sessionId && b.position === position + 1)?.name ??
      null
    );
  }

  const ownerIds = [...new Set(overdueBlocks.map((b) => sessionById.get(b.session_id)!.owner_id))];
  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("owner_id", ownerIds);
  if (subscriptionsError) throw subscriptionsError;

  const pushRepo = new SupabasePushSubscriptionRepository(supabase);
  let sent = 0;
  let expired = 0;

  for (const block of overdueBlocks) {
    const ownerId = sessionById.get(block.session_id)!.owner_id;
    const next = nextBlockName(block.session_id, block.position);
    const ownerSubscriptions = subscriptions.filter((s) => s.owner_id === ownerId);

    for (const sub of ownerSubscriptions) {
      const result = await sendPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          kind: "session-phase",
          title: "Fase completada",
          body: next ? `Toca para pasar a "${next}".` : "Sesión completada.",
          sessionId: block.session_id,
          hasNextPhase: next !== null,
        },
      );
      if (result.ok) sent += 1;
      if (result.expired) {
        expired += 1;
        await pushRepo.deleteByEndpoint(sub.endpoint);
      }
    }

    const { error } = await supabase
      .from("session_blocks")
      .update({ phase_alert_sent: true })
      .eq("id", block.id);
    if (error) throw error;
  }

  return NextResponse.json({ sent, expired, alerted: overdueBlocks.length });
}
