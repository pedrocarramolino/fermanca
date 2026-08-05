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
