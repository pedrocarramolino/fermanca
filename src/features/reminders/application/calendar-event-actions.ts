"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseCalendarEventRepository } from "@/core/infrastructure/supabase/repositories/calendar-event-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import { deleteQstashSchedule } from "@/core/infrastructure/qstash/client";
import type { CalendarEventId, UserId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

/** `notifyAt` es opcional — sin él, el evento se guarda como una fecha
 * suelta sin ningún aviso. Cuando viene, tiene que caer en el futuro:
 * avisar de algo que ya pasó no tendría sentido. El aviso lo manda
 * /api/cron/notifications al llegar ese instante (ver
 * claim_due_notifications). */
function parseNotifyAt(notifyAt: string | null): Date | null {
  const notifyAtDate = notifyAt ? new Date(notifyAt) : null;
  if (notifyAtDate && notifyAtDate.getTime() <= Date.now()) {
    throw new Error("La hora del aviso tiene que ser en el futuro.");
  }
  return notifyAtDate;
}

export async function createCalendarEvent(title: string, date: string, notifyAt: string | null) {
  const { userId, client } = await requireUserId();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("El evento necesita un nombre.");
  const notifyAtDate = parseNotifyAt(notifyAt);

  const repo = new SupabaseCalendarEventRepository(client);
  const event = await repo.create(userId, { title: trimmed, date, notifyAt: notifyAtDate });

  revalidatePath("/reminders");
  return event;
}

/** Cambiar la hora del aviso lo vuelve a dejar pendiente (un trigger pone
 * notified_at a null, ver 20261103120000_notifications_dispatcher.sql). */
export async function updateCalendarEvent(
  id: string,
  title: string,
  date: string,
  notifyAt: string | null,
) {
  const { userId, client } = await requireUserId();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("El evento necesita un nombre.");
  const notifyAtDate = parseNotifyAt(notifyAt);

  const repo = new SupabaseCalendarEventRepository(client);
  const previousScheduleId = await repo.getQstashScheduleId(id as CalendarEventId, userId);

  const event = await repo.update(id as CalendarEventId, userId, {
    title: trimmed,
    date,
    notifyAt: notifyAtDate,
  });

  // Schedule de QStash de antes del cambio de sistema, si lo tenía.
  if (previousScheduleId) {
    await deleteQstashSchedule(previousScheduleId);
    await repo.setQstashScheduleId(event.id, userId, null);
  }

  revalidatePath("/reminders");
  return event;
}

export async function deleteCalendarEvent(id: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseCalendarEventRepository(client);
  const scheduleId = await repo.getQstashScheduleId(id as CalendarEventId, userId);
  await repo.delete(id as CalendarEventId, userId);
  if (scheduleId) await deleteQstashSchedule(scheduleId);
  revalidatePath("/reminders");
}
