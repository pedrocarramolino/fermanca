import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSettings } from "@/core/domain/user-settings";
import type { UserId } from "@/core/domain/ids";
import type { UserSettingsRepository } from "@/core/domain/repositories/user-settings-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

type Row = Database["public"]["Tables"]["user_settings"]["Row"];

const DEFAULTS: Omit<UserSettings, "ownerId"> = {
  theme: "system",
  sound: "classic",
  volume: 80,
  vibrationEnabled: true,
  visualAlertDurationMs: 3000,
  accentColor: null,
  timezone: "UTC",
};

function toDomain(ownerId: UserId, row: Row | null): UserSettings {
  if (!row) return { ownerId, ...DEFAULTS };
  return {
    ownerId,
    theme: row.theme,
    sound: row.sound,
    volume: row.volume,
    vibrationEnabled: row.vibration_enabled,
    visualAlertDurationMs: row.visual_alert_duration_ms,
    accentColor: row.accent_color,
    timezone: row.timezone,
  };
}

export class SupabaseUserSettingsRepository implements UserSettingsRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async get(ownerId: UserId): Promise<UserSettings> {
    const { data, error } = await this.client
      .from("user_settings")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;
    return toDomain(ownerId, data);
  }

  async upsert(
    ownerId: UserId,
    changes: Partial<Omit<UserSettings, "ownerId">>,
  ): Promise<UserSettings> {
    const current = await this.get(ownerId);
    const merged = { ...current, ...changes };

    const { data, error } = await this.client
      .from("user_settings")
      .upsert({
        owner_id: ownerId,
        theme: merged.theme,
        sound: merged.sound,
        volume: merged.volume,
        vibration_enabled: merged.vibrationEnabled,
        visual_alert_duration_ms: merged.visualAlertDurationMs,
        accent_color: merged.accentColor,
        timezone: merged.timezone,
      })
      .select("*")
      .single();

    if (error) throw error;
    return toDomain(ownerId, data);
  }
}
