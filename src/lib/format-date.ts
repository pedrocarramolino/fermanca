import { siteConfig } from "@/config/site";
import type { Locale } from "@/core/domain/user-settings";

export const INTL_TAG: Record<Locale, string> = {
  es: "es-ES",
  en: "en-US",
  de: "de-DE",
};

export function formatSessionDate(date: Date, locale?: Locale): string {
  return new Intl.DateTimeFormat(locale ? INTL_TAG[locale] : siteConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Sin hora — para fechas sueltas (eventos de calendario) donde no hay un
 * instante concreto que mostrar, solo el día. */
export function formatEventDate(date: Date, locale?: Locale): string {
  return new Intl.DateTimeFormat(locale ? INTL_TAG[locale] : siteConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
