import { siteConfig } from "@/config/site";

export function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat(siteConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
