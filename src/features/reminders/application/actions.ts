"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseReminderRepository } from "@/core/infrastructure/supabase/repositories/reminder-repository";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { DayOfWeek } from "@/core/domain/reminder";
import type { ReminderId, UserId } from "@/core/domain/ids";
import {
  createReminderSchedule,
  deleteQstashSchedule,
} from "@/core/infrastructure/qstash/client";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

export async function createReminder(timeOfDay: string, daysOfWeek: DayOfWeek[]) {
  try {
    const { userId, client } = await requireUserId();
    const repo = new SupabaseReminderRepository(client);
    const reminder = await repo.create(userId, { timeOfDay, daysOfWeek, enabled: true });

    const timezone = (await new SupabaseUserSettingsRepository(client).get(userId)).timezone;
    const scheduleId = await createReminderSchedule(reminder.id, timeOfDay, daysOfWeek, timezone);
    if (scheduleId) await repo.setQstashScheduleId(reminder.id, userId, scheduleId);

    revalidatePath("/reminders");
    return reminder;
  } catch (error) {
    console.error("DEBUG createReminder failed:", error);
    throw error;
  }
}

export async function setReminderEnabled(id: string, enabled: boolean) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseReminderRepository(client);
  const previousScheduleId = await repo.getQstashScheduleId(id as ReminderId, userId);
  const reminder = await repo.update(id as ReminderId, userId, { enabled });

  if (enabled) {
    const timezone = (await new SupabaseUserSettingsRepository(client).get(userId)).timezone;
    const scheduleId = await createReminderSchedule(
      reminder.id,
      reminder.timeOfDay,
      reminder.daysOfWeek,
      timezone,
    );
    await repo.setQstashScheduleId(id as ReminderId, userId, scheduleId);
  } else if (previousScheduleId) {
    await deleteQstashSchedule(previousScheduleId);
    await repo.setQstashScheduleId(id as ReminderId, userId, null);
  }

  revalidatePath("/reminders");
}

export async function deleteReminder(id: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseReminderRepository(client);
  const scheduleId = await repo.getQstashScheduleId(id as ReminderId, userId);
  await repo.delete(id as ReminderId, userId);
  if (scheduleId) await deleteQstashSchedule(scheduleId);
  revalidatePath("/reminders");
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const { userId, client } = await requireUserId();
  const repo = new SupabasePushSubscriptionRepository(client);
  await repo.save({
    ownerId: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
}

export async function removePushSubscription(endpoint: string) {
  const { client } = await requireUserId();
  const repo = new SupabasePushSubscriptionRepository(client);
  await repo.deleteByEndpoint(endpoint);
}

/** Se llama sola al cargar la página de recordatorios (ver use-timezone-sync). */
export async function syncTimezone(timezone: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseUserSettingsRepository(client);
  const current = await repo.get(userId);
  if (current.timezone !== timezone) {
    await repo.upsert(userId, { timezone });
  }
}
