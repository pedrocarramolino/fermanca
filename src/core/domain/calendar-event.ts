import type { CalendarEventId, UserId } from "@/core/domain/ids";

export interface CalendarEvent {
  id: CalendarEventId;
  ownerId: UserId;
  title: string;
  /** "YYYY-MM-DD", sin hora — es una fecha, no un instante. */
  date: string;
  /** Día y hora exactos en los que llega el aviso por push, si se pidió
   * uno — independiente de `date`, para poder avisar unos días antes. */
  notifyAt: Date | null;
  createdAt: Date;
}

/** Días de diferencia entre `today` y `event.date`: positivo si el evento
 * está por venir, 0 si es hoy, negativo si ya pasó. Compara solo por fecha
 * (ambas normalizadas a medianoche UTC), no por hora exacta — un evento
 * "hoy" sigue siendo "hoy" pase la hora que pase. */
export function daysUntil(eventDate: string, today: Date): number {
  const todayKey = today.toISOString().slice(0, 10);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (new Date(`${eventDate}T00:00:00Z`).getTime() - new Date(`${todayKey}T00:00:00Z`).getTime()) /
      msPerDay,
  );
}
