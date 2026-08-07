import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";

/**
 * QStash llama aquí 2 minutos después del aviso principal de fin de fase
 * (encadenado desde /api/qstash/session-phase-alert una vez entregado ese
 * aviso — ver el comentario allí). Si para entonces el bloque ya no está
 * `active` (se confirmó la fase, o se amplió el tiempo y con ello el ciclo
 * entero), no hay nada que recordar: transitionBlock/extendActiveBlock ya
 * cancelaron este mensaje antes de que llegara a dispararse, y este es solo
 * el cinturón de seguridad para una entrega que se coló de todos modos.
 * phase_reminder_sent evita reenviarlo si QStash reintenta la entrega.
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
    .select("id, session_id, position, status, phase_reminder_sent")
    .eq("id", blockId)
    .maybeSingle();
  if (blockError) throw blockError;

  if (!block || block.status !== "active" || block.phase_reminder_sent) {
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
        title: "¡Vamos, que seguimos! 🎺",
        body: nextBlock
          ? `Llevas 2 minutos sin pasar a "${nextBlock.name}". Vuelve a tu sesión.`
          : "Llevas 2 minutos sin terminar la sesión. Vuelve a tu sesión.",
        sessionId: block.session_id,
        hasNextPhase: nextBlock !== null,
      },
    );
    if (result.ok) sent += 1;
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }

  const { error: markError } = await supabase
    .from("session_blocks")
    .update({ phase_reminder_sent: true })
    .eq("id", block.id);
  if (markError) throw markError;

  return NextResponse.json({ sent });
}
