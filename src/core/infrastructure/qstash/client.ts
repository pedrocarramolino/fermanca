import "server-only";
import { Client } from "@upstash/qstash";
import type { DayOfWeek } from "@/core/domain/reminder";

let cachedClient: Client | null = null;

function getClient(): Client {
  cachedClient ??= new Client({ token: process.env.QSTASH_TOKEN });
  return cachedClient;
}

function appUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("Falta la variable de entorno APP_URL.");
  return url;
}

export async function scheduleSessionPhaseAlert(
  blockId: string,
  delaySeconds: number,
): Promise<string> {
  const { messageId } = await getClient().publishJSON({
    url: `${appUrl()}/api/qstash/session-phase-alert`,
    body: { blockId },
    delay: Math.max(0, Math.round(delaySeconds)),
  });
  return messageId;
}

/** Best-effort: si el mensaje ya se entregó o ya no existe, no hay nada que
 * deshacer — no debe tumbar la transición de fase por esto. */
export async function cancelQstashMessage(messageId: string): Promise<void> {
  try {
    await getClient().messages.cancel(messageId);
  } catch {
    // Ignorado a propósito.
  }
}

/** QStash evalúa el cron en UTC salvo que se le indique otra zona con el
 * prefijo CRON_TZ dentro de la propia expresión (no es un parámetro aparte). */
function reminderCron(timeOfDay: string, daysOfWeek: DayOfWeek[], timezone: string): string {
  const [hour, minute] = timeOfDay.split(":");
  return `CRON_TZ=${timezone} ${Number(minute)} ${Number(hour)} * * ${daysOfWeek.join(",")}`;
}

/** Un recordatorio sin días marcados no tiene una expresión cron válida que
 * lo represente — no crear schedule equivale a dejarlo sin disparo. */
export async function createReminderSchedule(
  reminderId: string,
  timeOfDay: string,
  daysOfWeek: DayOfWeek[],
  timezone: string,
): Promise<string | null> {
  if (daysOfWeek.length === 0) return null;
  const { scheduleId } = await getClient().schedules.create({
    destination: `${appUrl()}/api/qstash/reminder-alert`,
    body: JSON.stringify({ reminderId }),
    headers: { "Content-Type": "application/json" },
    cron: reminderCron(timeOfDay, daysOfWeek, timezone),
  });
  return scheduleId;
}

export async function deleteQstashSchedule(scheduleId: string): Promise<void> {
  try {
    await getClient().schedules.delete(scheduleId);
  } catch {
    // Best-effort, igual que cancelQstashMessage.
  }
}
