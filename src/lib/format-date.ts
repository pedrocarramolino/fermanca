import { siteConfig } from "@/config/site";
import type { Locale } from "@/core/domain/user-settings";
import { DEFAULT_TIME_ZONE } from "@/lib/time-zone";

export const INTL_TAG: Record<Locale, string> = {
  es: "es-ES",
  en: "en-US",
  de: "de-DE",
};

/**
 * Un instante concreto (cuándo empezó una sesión, cuándo se publicó algo).
 * `timeZone` es obligatorio a propósito: sin él cada máquina usa la suya y
 * el servidor (UTC) y el móvil pintan horas distintas — error de
 * hidratación #418. Sale de `useTimeZone()` en el navegador o de
 * `getTimeZone()` en el servidor (next-intl; ver src/lib/time-zone.ts).
 * Si llegara vacío se usa la hora de España, igual en los dos lados.
 */
export function formatSessionDate(
  date: Date,
  locale: Locale | undefined,
  timeZone: string | undefined,
): string {
  return new Intl.DateTimeFormat(locale ? INTL_TAG[locale] : siteConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone ?? DEFAULT_TIME_ZONE,
  }).format(date);
}

/** El día de un instante, sin la hora (p. ej. "miembro desde"). */
export function formatEventDate(
  date: Date,
  locale: Locale | undefined,
  timeZone: string | undefined,
): string {
  return new Intl.DateTimeFormat(locale ? INTL_TAG[locale] : siteConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timeZone ?? DEFAULT_TIME_ZONE,
  }).format(date);
}

/**
 * Una fecha de calendario sin hora ("2026-10-03", como `calendar_events.
 * event_date`). Se lee y se pinta en UTC para que sea siempre ese mismo
 * día, esté donde esté el servidor o el móvil.
 */
export function formatCalendarDate(isoDate: string, locale: Locale | undefined): string {
  return formatEventDate(new Date(`${isoDate}T00:00:00Z`), locale, "UTC");
}
