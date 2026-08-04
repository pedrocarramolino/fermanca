import type { Reminder } from "@/core/domain/reminder";
import type { ReminderId, UserId } from "@/core/domain/ids";

export type NewReminder = Omit<Reminder, "id" | "ownerId">;

export interface ReminderRepository {
  listByOwner(ownerId: UserId): Promise<Reminder[]>;
  create(ownerId: UserId, input: NewReminder): Promise<Reminder>;
  update(id: ReminderId, ownerId: UserId, changes: Partial<NewReminder>): Promise<Reminder>;
  delete(id: ReminderId, ownerId: UserId): Promise<void>;
  /** Id del Schedule de QStash que dispara este recordatorio, si tiene uno. */
  getQstashScheduleId(id: ReminderId, ownerId: UserId): Promise<string | null>;
  setQstashScheduleId(id: ReminderId, ownerId: UserId, scheduleId: string | null): Promise<void>;
}
