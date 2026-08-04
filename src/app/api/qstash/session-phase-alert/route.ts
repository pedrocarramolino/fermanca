import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";

/**
 * QStash llama aquí una sola vez, en el instante exacto en que un bloque
 * debería terminar (programado por SupabaseSessionRepository.start()/
 * transitionBlock con delay = duración planeada) — sustituye al sondeo por
 * cron. phase_alert_sent sigue de cinturón de seguridad: si el cliente ya
 * mostró su propio aviso local justo antes (markPhaseAlertSent), o si la
 * fase se confirmó a mano y el mensaje no llegó a cancelarse a tiempo, aquí
 * no se hace nada.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyQstashSignature(request, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { blockId } = JSON.parse(rawBody) as { blockId: string };
  const supabase = createServiceClient();

  const { data: block, error: blockError } = await supabase
    .from("session_blocks")
    .select("id, session_id, position, status, phase_alert_sent")
    .eq("id", blockId)
    .maybeSingle();
  if (blockError) throw blockError;

  if (!block || block.status !== "active" || block.phase_alert_sent) {
    return NextResponse.json({ sent: 0, skipped: true });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, owner_id, status")
    .eq("id", block.session_id)
    .single();
  if (sessionError) throw sessionError;

  if (session.status !== "in_progress") {
    return NextResponse.json({ sent: 0, skipped: true });
  }

  const { data: nextBlock, error: nextBlockError } = await supabase
    .from("session_blocks")
    .select("name")
    .eq("session_id", block.session_id)
    .eq("position", block.position + 1)
    .maybeSingle();
  if (nextBlockError) throw nextBlockError;

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", session.owner_id);
  if (subscriptionsError) throw subscriptionsError;

  const pushRepo = new SupabasePushSubscriptionRepository(supabase);
  let sent = 0;

  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "session-phase",
        title: "Fase completada",
        body: nextBlock ? `Toca para pasar a "${nextBlock.name}".` : "Sesión completada.",
        sessionId: block.session_id,
        hasNextPhase: nextBlock !== null,
      },
    );
    if (result.ok) sent += 1;
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }

  const { error: markError } = await supabase
    .from("session_blocks")
    .update({ phase_alert_sent: true })
    .eq("id", block.id);
  if (markError) throw markError;

  return NextResponse.json({ sent });
}
