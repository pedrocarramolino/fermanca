import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  getAuthenticatedUser,
  getCurrentUserSettings,
} from "@/core/infrastructure/supabase/current-user";
import type { Locale } from "@/core/domain/user-settings";

const LOCALES: Locale[] = ["es", "en", "de"];
export const GUEST_LOCALE_COOKIE = "locale";

/**
 * Sin rutas `/en`, `/de` en la URL: con sesión, el idioma viene de
 * `user_settings.locale` (mismo sitio que tema/sonido/acento). Sin sesión
 * (login, registro…) no hay fila de ajustes todavía, así que se usa una
 * cookie que el propio selector de esas pantallas escribe — si no existe,
 * español por defecto.
 */
async function resolveLocale(): Promise<Locale> {
  try {
    const { userId } = await getAuthenticatedUser();
    if (userId) {
      const settings = await getCurrentUserSettings();
      return settings.locale;
    }
  } catch {
    // Se degrada a la cookie/valor por defecto de más abajo.
  }

  const guestLocale = (await cookies()).get(GUEST_LOCALE_COOKIE)?.value;
  return LOCALES.includes(guestLocale as Locale) ? (guestLocale as Locale) : "es";
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
