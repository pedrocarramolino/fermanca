import type { UserSettings } from "@/core/domain/user-settings";
import type { UserId } from "@/core/domain/ids";

export interface UserSettingsRepository {
  /** Devuelve los valores por defecto si el usuario aún no ha guardado nada. */
  get(ownerId: UserId): Promise<UserSettings>;
  upsert(ownerId: UserId, changes: Partial<Omit<UserSettings, "ownerId">>): Promise<UserSettings>;
}
