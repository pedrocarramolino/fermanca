import type { CalendarEvent } from "@/core/domain/calendar-event";
import type { CalendarEventId, UserId } from "@/core/domain/ids";

export type NewCalendarEvent = Pick<CalendarEvent, "title" | "date" | "notifyAt">;

export interface CalendarEventRepository {
  listByOwner(ownerId: UserId): Promise<CalendarEvent[]>;
  create(ownerId: UserId, input: NewCalendarEvent): Promise<CalendarEvent>;
  delete(id: CalendarEventId, ownerId: UserId): Promise<void>;
  /** Id del mensaje QStash pendiente para el aviso de este evento, si tiene
   * uno programado — igual que en session_blocks, para poder cancelarlo. */
  getQstashMessageId(id: CalendarEventId, ownerId: UserId): Promise<string | null>;
  setQstashMessageId(id: CalendarEventId, ownerId: UserId, messageId: string | null): Promise<void>;
}
