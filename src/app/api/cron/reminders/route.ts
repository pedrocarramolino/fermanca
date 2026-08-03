import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { isReminderPending, localTimeParts } from "@/core/domain/reminder-schedule";
import type { DayOfWeek } from "@/core/domain/reminder";

/**
 * Pensado para llamarse cada minuto (Vercel Cron de pago) o cada ~5 minutos
 * (alternativa gratuita por GitHub Actions/cron-job.org, ver README): la
 * ventana de tolerancia de `isReminderPending` y `last_triggered_on` hacen
 * que ninguna de las dos cadencias se salte recordatorios ni los duplique.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  const [{ data: reminders, error: remindersError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from("reminders").select("*").eq("enabled", true),
      supabase.from("user_settings").select("owner_id, timezone"),
    ]);
  if (remindersError) throw remindersError;
  if (settingsError) throw settingsError;

  const timezoneByOwner = new Map(settings.map((s) => [s.owner_id, s.timezone]));

  const pendingReminderIds: string[] = [];
  const pendingOwnerIds = new Set<string>();

  for (const row of reminders) {
    const timezone = timezoneByOwner.get(row.owner_id) ?? "UTC";
    const pending = isReminderPending(
      {
        timeOfDay: row.time_of_day.slice(0, 5),
        daysOfWeek: row.days_of_week as DayOfWeek[],
        enabled: row.enabled,
        lastTriggeredOn: row.last_triggered_on,
      },
      timezone,
      now,
    );
    if (pending) {
      pendingReminderIds.push(row.id);
      pendingOwnerIds.add(row.owner_id);
    }
  }

  if (pendingReminderIds.length === 0) {
    return NextResponse.json({ sent: 0, expired: 0, remindersMarked: 0 });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("owner_id", [...pendingOwnerIds]);
  if (subscriptionsError) throw subscriptionsError;

  const pushRepo = new SupabasePushSubscriptionRepository(supabase);
  let sent = 0;
  let expired = 0;

  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        title: "Hora de practicar",
        body: "Tienes un recordatorio de práctica ahora mismo.",
        url: "/",
      },
    );
    if (result.ok) sent += 1;
    if (result.expired) {
      expired += 1;
      await pushRepo.deleteByEndpoint(sub.endpoint);
    }
  }

  // Marcar como disparados hoy usa la fecha local del propio dueño del
  // recordatorio, no la del servidor — importa cerca de medianoche.
  for (const reminderId of pendingReminderIds) {
    const row = reminders.find((r) => r.id === reminderId)!;
    const timezone = timezoneByOwner.get(row.owner_id) ?? "UTC";
    const { isoDate } = localTimeParts(timezone, now);
    const { error } = await supabase
      .from("reminders")
      .update({ last_triggered_on: isoDate })
      .eq("id", reminderId);
    if (error) throw error;
  }

  return NextResponse.json({ sent, expired, remindersMarked: pendingReminderIds.length });
}
