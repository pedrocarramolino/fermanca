import type { DayOfWeek, Reminder } from "@/core/domain/reminder";

const WEEKDAY_TO_NUMBER: Record<string, DayOfWeek> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface LocalTimeParts {
  hhmm: string;
  dayOfWeek: DayOfWeek;
  /** "YYYY-MM-DD" en la zona horaria dada, para comparar "hoy" sin líos de UTC. */
  isoDate: string;
}

/** Hora, día de la semana y fecha locales a `timezone` en el instante `now`. */
export function localTimeParts(timezone: string, now: Date): LocalTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Intl puede devolver "24" para medianoche en hour12:false; normalizamos a "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  const minute = get("minute");
  const dayOfWeek = WEEKDAY_TO_NUMBER[get("weekday")] ?? 0;
  const isoDate = `${get("year")}-${get("month")}-${get("day")}`;

  return { hhmm: `${hour}:${minute}`, dayOfWeek, isoDate };
}

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Un recordatorio está "pendiente de disparar" si: está activo, hoy toca por
 * día de la semana, la hora local ya pasó de su hora configurada pero por
 * menos de `graceMinutes`, y no se ha disparado ya hoy. La ventana de
 * tolerancia es lo que permite que un cron cada 5 minutos (en vez de cada
 * minuto exacto) no se salte recordatorios ni los reenvíe duplicados.
 */
export function isReminderPending(
  reminder: Pick<Reminder, "timeOfDay" | "daysOfWeek" | "enabled"> & {
    lastTriggeredOn: string | null;
  },
  timezone: string,
  now: Date,
  graceMinutes = 5,
): boolean {
  if (!reminder.enabled) return false;

  const local = localTimeParts(timezone, now);
  if (!reminder.daysOfWeek.includes(local.dayOfWeek)) return false;
  if (reminder.lastTriggeredOn === local.isoDate) return false;

  const diff = minutesSinceMidnight(local.hhmm) - minutesSinceMidnight(reminder.timeOfDay);
  return diff >= 0 && diff < graceMinutes;
}
