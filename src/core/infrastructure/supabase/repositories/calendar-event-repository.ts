import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/core/domain/calendar-event";
import type { CalendarEventId, UserId } from "@/core/domain/ids";
import type {
  CalendarEventRepository,
  NewCalendarEvent,
} from "@/core/domain/repositories/calendar-event-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["calendar_events"]["Row"];

function toDomain(row: Row): CalendarEvent {
  return {
    id: row.id as CalendarEventId,
    ownerId: row.owner_id as UserId,
    title: row.title,
    date: row.event_date,
    notifyAt: row.notify_at ? new Date(row.notify_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseCalendarEventRepository implements CalendarEventRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listByOwner(ownerId: UserId): Promise<CalendarEvent[]> {
    const { data, error } = await this.client
      .from("calendar_events")
      .select("*")
      .eq("owner_id", ownerId)
      .order("event_date", { ascending: true });

    if (error) throw error;
    return data.map(toDomain);
  }

  async create(ownerId: UserId, input: NewCalendarEvent): Promise<CalendarEvent> {
    const { data, error } = await this.client
      .from("calendar_events")
      .insert({
        owner_id: ownerId,
        title: input.title,
        event_date: input.date,
        notify_at: input.notifyAt?.toISOString() ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(data);
  }

  async delete(id: CalendarEventId, ownerId: UserId): Promise<void> {
    const { error } = await this.client
      .from("calendar_events")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }

  async getQstashScheduleId(id: CalendarEventId, ownerId: UserId): Promise<string | null> {
    const { data, error } = await this.client
      .from("calendar_events")
      .select("qstash_schedule_id")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw error;
    return data?.qstash_schedule_id ?? null;
  }

  async setQstashScheduleId(
    id: CalendarEventId,
    ownerId: UserId,
    scheduleId: string | null,
  ): Promise<void> {
    const { error } = await this.client
      .from("calendar_events")
      .update({ qstash_schedule_id: scheduleId })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }
}
