import "server-only";
import { Client } from "@upstash/qstash";

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

/**
 * Identificador fijo que tenían los Schedules de QStash de cada recordatorio
 * y aviso de calendario (hasta el 3/11/2026 —ahora los manda
 * /api/cron/notifications—; se conserva para poder borrar los que queden).
 * Derivado de su id. Antes lo elegía QStash al azar y solo
 * quedaba apuntado en la fila de la base de datos: si esa fila desaparecía
 * sin pasar por deleteReminder/deleteCalendarEvent (al borrar la cuenta se
 * van en cascada), la programación seguía disparando para siempre sin que
 * nadie supiera su id. Con un id fijo, la ruta que recibe el aviso puede
 * borrarla ella misma al ver que ya no hay nada que avisar. Crear con un id
 * que ya existe la sobrescribe, así que tampoco se pueden duplicar.
 */
export function reminderScheduleId(reminderId: string): string {
  return `reminder-${reminderId}`;
}

export function calendarEventScheduleId(eventId: string): string {
  return `calendar-event-${eventId}`;
}

/**
 * Para las rutas que reciben un aviso programado y descubren que ya no hay
 * nada que avisar (la fila se borró): borra la programación que las ha
 * llamado para que no vuelva a disparar. Se borra por el id fijo (ver
 * reminderScheduleId) y, además, por el que traiga la cabecera
 * Upstash-Schedule-Id si QStash la manda — eso cubre también las
 * programaciones antiguas, creadas antes de que el id fuera fijo.
 */
export async function deleteOrphanSchedule(request: Request, scheduleId: string): Promise<void> {
  const fromHeader = request.headers.get("upstash-schedule-id");
  await deleteQstashSchedule(scheduleId);
  if (fromHeader && fromHeader !== scheduleId) await deleteQstashSchedule(fromHeader);
}

export async function deleteQstashSchedule(scheduleId: string): Promise<void> {
  try {
    await getClient().schedules.delete(scheduleId);
  } catch {
    // Best-effort, igual que cancelQstashMessage.
  }
}
