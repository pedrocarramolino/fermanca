import type { UserId } from "@/core/domain/ids";

export type ThemePreference = "light" | "dark" | "system";
export type SoundChoice = "classic" | "bell" | "metronome" | "piano" | "none";

export interface UserSettings {
  ownerId: UserId;
  theme: ThemePreference;
  sound: SoundChoice;
  /** 0-100 */
  volume: number;
  vibrationEnabled: boolean;
  visualAlertDurationMs: number;
  /** Override del color de marca; null = usar el primario por defecto. */
  accentColor: string | null;
  /** IANA (p. ej. "Europe/Madrid"). Se detecta sola en el navegador. */
  timezone: string;
}
