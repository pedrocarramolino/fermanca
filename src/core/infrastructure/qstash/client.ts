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

/** Con cuánta antelación al fin de fase se manda el aviso de "quedan 5
 * minutos" — quien programa este aviso resta esto a lo que quede de fase, y
 * se salta la programación por completo si no llega a haber ese margen. */
export const PHASE_FIVE_MIN_ALERT_LEAD_SECONDS = 5 * 60;

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

/** Encadenado desde session-phase-alert una vez entregado el aviso
 * principal, no desde donde se programa este — así el recordatorio hereda
 * gratis toda la cancelación ya existente (transitionBlock/extendActiveBlock
 * cancelan lo que haya en qstash_message_id, sea el aviso principal o este
 * recordatorio, sin necesitar una columna aparte para su id). */
export async function scheduleSessionPhaseReminder(
  blockId: string,
  delaySeconds: number,
): Promise<string> {
  const { messageId } = await getClient().publishJSON({
    url: `${appUrl()}/api/qstash/session-phase-reminder`,
    body: { blockId },
    delay: Math.max(0, Math.round(delaySeconds)),
  });
  return messageId;
}

/** Aviso de "quedan 5 minutos", independiente del de fin de fase — mensaje
 * QStash aparte (columna qstash_five_min_message_id) para poder cancelarlo o
 * reprogramarlo sin tocar el slot que ya usa scheduleSessionPhaseAlert. */
export async function scheduleSessionPhaseFiveMinAlert(
  blockId: string,
  delaySeconds: number,
): Promise<string> {
  const { messageId } = await getClient().publishJSON({
    url: `${appUrl()}/api/qstash/session-phase-five-min-alert`,
    body: { blockId },
    delay: Math.max(0, Math.round(delaySeconds)),
  });
  return messageId;
}

/** 20h sin practicar desde la última sesión (terminada o abandonada) — un
 * solo mensaje QStash por sesión, programado al cerrarla. Si para cuando
 * llegue el usuario ya ha hecho otra sesión, /api/qstash/streak-alert ve que
 * esta ya no es la más reciente y no manda nada — así no hace falta cancelar
 * nada al empezar una sesión nueva, ni una columna que lleve la cuenta. */
const STREAK_ALERT_DELAY_SECONDS = 20 * 60 * 60;

export async function scheduleStreakAlert(ownerId: string, sessionId: string): Promise<string> {
  const { messageId } = await getClient().publishJSON({
    url: `${appUrl()}/api/qstash/streak-alert`,
    body: { ownerId, sessionId },
    delay: STREAK_ALERT_DELAY_SECONDS,
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

/** minute hour day-of-month month * — un cron de un solo campo de año no
 * existe en el formato estándar de 5 campos, así que esta expresión en
 * realidad se repetiría cada año en esa fecha; calendar-event-alert borra el
 * Schedule nada más entregar el aviso para que se comporte como un disparo
 * único. Se calcula en UTC (sin prefijo CRON_TZ) porque `notifyAt` ya es un
 * instante absoluto resuelto en el navegador del usuario, no una hora local
 * que QStash tenga que reinterpretar. */
function oneShotCron(notifyAt: Date): string {
  return `${notifyAt.getUTCMinutes()} ${notifyAt.getUTCHours()} ${notifyAt.getUTCDate()} ${notifyAt.getUTCMonth() + 1} *`;
}

/** Aviso puntual para un evento de calendario, en un instante concreto que
 * puede estar a meses vista — un mensaje normal (`notBefore`/`delay`) no
 * sirve porque el plan de QStash limita esos plazos a 7 días; un Schedule
 * (cron) no tiene ese límite, así que se usa ese mecanismo aunque el aviso
 * no sea recurrente (ver oneShotCron). */
export async function scheduleCalendarEventNotification(
  eventId: string,
  notifyAt: Date,
): Promise<string> {
  const { scheduleId } = await getClient().schedules.create({
    destination: `${appUrl()}/api/qstash/calendar-event-alert`,
    body: JSON.stringify({ eventId }),
    headers: { "Content-Type": "application/json" },
    cron: oneShotCron(notifyAt),
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
