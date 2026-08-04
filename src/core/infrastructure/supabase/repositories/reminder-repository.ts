import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayOfWeek, Reminder } from "@/core/domain/reminder";
import type { ReminderId, UserId } from "@/core/domain/ids";
import type {
  NewReminder,
  ReminderRepository,
} from "@/core/domain/repositories/reminder-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["reminders"]["Row"];

function toDomain(row: Row): Reminder {
  return {
    id: row.id as ReminderId,
    ownerId: row.owner_id as UserId,
    // Postgres `time` vuelve como "HH:MM:SS"; el dominio usa "HH:mm".
    timeOfDay: row.time_of_day.slice(0, 5),
    daysOfWeek: row.days_of_week as DayOfWeek[],
    enabled: row.enabled,
  };
}

export class SupabaseReminderRepository implements ReminderRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listByOwner(ownerId: UserId): Promise<Reminder[]> {
    const { data, error } = await this.client
      .from("reminders")
      .select("*")
      .eq("owner_id", ownerId)
      .order("time_of_day", { ascending: true });

    if (error) throw error;
    return data.map(toDomain);
  }

  async create(ownerId: UserId, input: NewReminder): Promise<Reminder> {
    const { data, error } = await this.client
      .from("reminders")
      .insert({
        owner_id: ownerId,
        time_of_day: input.timeOfDay,
        days_of_week: input.daysOfWeek,
        enabled: input.enabled,
      })
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(data);
  }

  async update(id: ReminderId, ownerId: UserId, changes: Partial<NewReminder>): Promise<Reminder> {
    const { data, error } = await this.client
      .from("reminders")
      .update({
        time_of_day: changes.timeOfDay,
        days_of_week: changes.daysOfWeek,
        enabled: changes.enabled,
      })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(data);
  }

  async delete(id: ReminderId, ownerId: UserId): Promise<void> {
    const { error } = await this.client
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }

  async getQstashScheduleId(id: ReminderId, ownerId: UserId): Promise<string | null> {
    const { data, error } = await this.client
      .from("reminders")
      .select("qstash_schedule_id")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw error;
    return data?.qstash_schedule_id ?? null;
  }

  async setQstashScheduleId(
    id: ReminderId,
    ownerId: UserId,
    scheduleId: string | null,
  ): Promise<void> {
    const { error } = await this.client
      .from("reminders")
      .update({ qstash_schedule_id: scheduleId })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }
}
