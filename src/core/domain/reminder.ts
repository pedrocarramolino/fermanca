import type { ReminderId, UserId } from "@/core/domain/ids";

/** 0 = domingo … 6 = sábado, igual que el smallint[] de la tabla reminders. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Reminder {
  id: ReminderId;
  ownerId: UserId;
  /** Hora local en formato "HH:mm". */
  timeOfDay: string;
  daysOfWeek: DayOfWeek[];
  enabled: boolean;
}
