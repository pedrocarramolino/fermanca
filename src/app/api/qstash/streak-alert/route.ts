import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";

/**
 * QStash llama aquí 20h después de que una sesión se cierre (terminada o
 * abandonada, ver scheduleStreakAlert en SupabaseSessionRepository.finish()).
 * No hay flag de "ya avisado" ni cancelación al empezar sesión nueva: en su
 * lugar, se comprueba si `sessionId` sigue siendo la sesión más reciente del
 * usuario (por started_at) — si ya ha practicado otra vez desde entonces
 * (terminada, abandonada o incluso en curso), la racha no corre peligro y no
 * se manda nada. Solo una sesión puede seguir siendo "la más reciente" en
 * cualquier momento dado, así que como mucho un mensaje de los programados
 * por sesión llega a enviar el aviso de verdad.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyQstashSignature(request, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ownerId, sessionId } = JSON.parse(rawBody) as { ownerId: string; sessionId: string };
  const supabase = createServiceClient();

  const { data: mostRecent, error: mostRecentError } = await supabase
    .from("sessions")
    .select("id")
    .eq("owner_id", ownerId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (mostRecentError) throw mostRecentError;

  if (!mostRecent || mostRecent.id !== sessionId) {
    return NextResponse.json({ sent: 0, skipped: true });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", ownerId);
  if (subscriptionsError) throw subscriptionsError;

  const pushRepo = new SupabasePushSubscriptionRepository(supabase);
  let sent = 0;

  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "streak-alert",
        title: "¡No dejes que se apague el fuego! 🔥",
        body: "Llevas casi un día sin practicar — oye, no querrás que se apague el fuegito, ¿no? Pues a estudiar.",
      },
    );
    if (result.ok) sent += 1;
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }

  return NextResponse.json({ sent });
}
