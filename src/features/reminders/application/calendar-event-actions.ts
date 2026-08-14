"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseCalendarEventRepository } from "@/core/infrastructure/supabase/repositories/calendar-event-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import {
  cancelQstashMessage,
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
 * futuro: QStash no admite `notBefore` en el pasado, y avisar de algo que
 * ya pasó no tendría sentido de todas formas. */
export async function createCalendarEvent(title: string, date: string, notifyAt: string | null) {
  const { userId, client } = await requireUserId();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("El evento necesita un nombre.");

  const notifyAtDate = notifyAt ? new Date(notifyAt) : null;
  if (notifyAtDate && notifyAtDate.getTime() <= Date.now()) {
    throw new Error("La hora del aviso tiene que ser en el futuro.");
  }

  const repo = new SupabaseCalendarEventRepository(client);
  const event = await repo.create(userId, { title: trimmed, date, notifyAt: notifyAtDate });

  if (notifyAtDate) {
    const messageId = await scheduleCalendarEventNotification(event.id, notifyAtDate);
    await repo.setQstashMessageId(event.id, userId, messageId);
  }

  revalidatePath("/reminders");
  return event;
}

export async function deleteCalendarEvent(id: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseCalendarEventRepository(client);
  const messageId = await repo.getQstashMessageId(id as CalendarEventId, userId);
  await repo.delete(id as CalendarEventId, userId);
  if (messageId) await cancelQstashMessage(messageId);
  revalidatePath("/reminders");
}
