import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";

/** QStash llama aquí en el instante exacto que se eligió al crear el evento
 * (ver scheduleCalendarEventNotification) — mismo patrón que reminder-alert,
 * pero de un solo disparo en vez de recurrente. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyQstashSignature(request, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { eventId } = JSON.parse(rawBody) as { eventId: string };
  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from("calendar_events")
    .select("id, owner_id, title")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) throw eventError;

  // Puede haberse borrado entre que se programó el aviso y que QStash lo
  // entrega — no es un error.
  if (!event) {
    return NextResponse.json({ sent: 0, skipped: true });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", event.owner_id);
  if (subscriptionsError) throw subscriptionsError;

  const pushRepo = new SupabasePushSubscriptionRepository(supabase);
  let sent = 0;

  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "reminder",
        title: event.title,
        body: "El evento que marcaste se acerca.",
        url: "/reminders",
      },
    );
    if (result.ok) sent += 1;
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }

  return NextResponse.json({ sent });
}
