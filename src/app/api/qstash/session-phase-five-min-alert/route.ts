import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";

/**
 * QStash llama aquí una sola vez, cuando a la fase activa le quedan 5
 * minutos (programado con delay = tiempo restante - 300s, ver
 * PHASE_FIVE_MIN_ALERT_LEAD_SECONDS). Independiente del aviso de "fase
 * completada": mismo patrón de cinturón de seguridad con
 * phase_five_min_alert_sent, para no reenviar si QStash reintenta la
 * entrega o si la fase ya cambió (se pausó, se confirmó a mano, terminó la
 * sesión) entre que se programó y que llegó el momento.
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
    .select("id, session_id, status, phase_five_min_alert_sent")
    .eq("id", blockId)
    .maybeSingle();
  if (blockError) throw blockError;

  if (!block || block.status !== "active" || block.phase_five_min_alert_sent) {
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
        kind: "session-phase-five-min",
        title: "¡Aprieta, que te quedan 5 minutos!",
        body: "La fase actual está a punto de terminar.",
        sessionId: block.session_id,
      },
    );
    if (result.ok) sent += 1;
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }

  const { error: markError } = await supabase
    .from("session_blocks")
    .update({ phase_five_min_alert_sent: true, qstash_five_min_message_id: null })
    .eq("id", block.id);
  if (markError) throw markError;

  return NextResponse.json({ sent });
}
