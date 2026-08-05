import { getRequestConfig } from "next-intl/server";
import {
  getAuthenticatedUser,
  getCurrentUserSettings,
} from "@/core/infrastructure/supabase/current-user";
import type { Locale } from "@/core/domain/user-settings";

/**
 * Sin rutas `/en`, `/de` en la URL: el idioma viene de `user_settings.locale`
 * (mismo sitio que tema/sonido/acento), no del enlace. Un visitante sin
 * sesión ve la app en español, que es el idioma por defecto de la cuenta.
 */
async function resolveLocale(): Promise<Locale> {
  try {
    const { userId } = await getAuthenticatedUser();
    if (!userId) return "es";
    const settings = await getCurrentUserSettings();
    return settings.locale;
  } catch {
    return "es";
  }
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
