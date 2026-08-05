"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setGuestLocale } from "@/features/settings/application/actions";
import type { Locale } from "@/core/domain/user-settings";

const OPTIONS: { value: Locale; flag: string; name: string }[] = [
  { value: "es", flag: "🇪🇸", name: "Español" },
  { value: "en", flag: "🇬🇧", name: "English" },
  { value: "de", flag: "🇩🇪", name: "Deutsch" },
];

export function AuthLocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleChange(value: Locale) {
    startTransition(async () => {
      await setGuestLocale(value);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleChange(option.value)}
          aria-pressed={locale === option.value}
          aria-label={option.name}
          className="opacity-60 hover:opacity-100 aria-pressed:opacity-100 rounded-md px-1.5 py-1 text-lg leading-none transition-opacity"
        >
          {option.flag}
        </button>
      ))}
    </div>
  );
}
