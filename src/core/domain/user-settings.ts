import type { UserId } from "@/core/domain/ids";

export type ThemePreference = "light" | "dark" | "system";
export type SoundChoice = "classic" | "bell" | "metronome" | "piano" | "alarm" | "none";
export type Locale = "es" | "en" | "de";
/** "glass" = Liquid Glass (vidrio esmerilado translúcido) — más estilos
 * (futurista, minimalista) se añadirán aquí más adelante. */
export type VisualStyle = "classic" | "glass";

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
  locale: Locale;
  visualStyle: VisualStyle;
  /** 0-100. Solo tiene efecto visible cuando visualStyle = "glass". */
  glassIntensity: number;
}
