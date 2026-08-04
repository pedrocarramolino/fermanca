import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";

/**
 * QStash llama aquí en el instante exacto configurado en el Schedule del
 * recordatorio (hora + días + timezone, ver createReminderSchedule) —
 * sustituye al sondeo por cron y a la ventana de gracia/last_triggered_on
 * que este necesitaba para no duplicar ni saltarse avisos.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyQstashSignature(request, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { reminderId } = JSON.parse(rawBody) as { reminderId: string };
  const supabase = createServiceClient();

  const { data: reminder, error: reminderError } = await supabase
    .from("reminders")
    .select("id, owner_id, enabled")
    .eq("id", reminderId)
    .maybeSingle();
  if (reminderError) throw reminderError;

  // Puede haberse desactivado o borrado entre que se programó el disparo y
  // que QStash lo entrega — no es un error.
  if (!reminder || !reminder.enabled) {
    return NextResponse.json({ sent: 0, skipped: true });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("owner_id", reminder.owner_id);
  if (subscriptionsError) throw subscriptionsError;

  const pushRepo = new SupabasePushSubscriptionRepository(supabase);
  let sent = 0;

  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        kind: "reminder",
        title: "¡A practicar!",
        body: "Es la hora que marcaste para tu sesión de hoy.",
        url: "/",
      },
    );
    if (result.ok) sent += 1;
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }

  return NextResponse.json({ sent });
}
