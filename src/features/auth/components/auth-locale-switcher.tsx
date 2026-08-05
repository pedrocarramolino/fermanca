"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setGuestLocale } from "@/features/settings/application/actions";
import type { Locale } from "@/core/domain/user-settings";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
  { value: "de", label: "DE" },
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
          className="text-muted-foreground hover:text-foreground aria-pressed:text-foreground aria-pressed:bg-muted rounded-md px-2 py-1 text-xs font-medium transition-colors"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
