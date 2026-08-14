"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseCalendarEventRepository } from "@/core/infrastructure/supabase/repositories/calendar-event-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import {
  deleteQstashSchedule,
  scheduleCalendarEventNotification,
} from "@/core/infrastructure/qstash/client";
import type { CalendarEventId, UserId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

/** `notifyAt` es opcional — sin él, el evento se guarda como una fecha
 * suelta sin ningún aviso programado. Cuando viene, tiene que caer en el
 * futuro: QStash no admite un Schedule para un instante ya pasado, y
 * avisar de algo que ya pasó no tendría sentido de todas formas. */
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

  if (notifyAtDate) {
    const scheduleId = await scheduleCalendarEventNotification(event.id, notifyAtDate);
    await repo.setQstashScheduleId(event.id, userId, scheduleId);
  }

  revalidatePath("/reminders");
  return event;
}

/** Sustituye siempre el Schedule anterior por uno nuevo en vez de intentar
 * reutilizarlo cambiándole el cron — más simple y sin casos especiales
 * (aviso añadido, quitado, o solo con la hora cambiada, se tratan todos
 * igual: cancelar lo que hubiera, programar lo que toque ahora). */
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

  if (previousScheduleId) await deleteQstashSchedule(previousScheduleId);
  if (notifyAtDate) {
    const scheduleId = await scheduleCalendarEventNotification(event.id, notifyAtDate);
    await repo.setQstashScheduleId(event.id, userId, scheduleId);
  } else {
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
