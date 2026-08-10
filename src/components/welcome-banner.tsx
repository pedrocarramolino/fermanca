"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "pf-welcome-shown";
// LaunchAnimation empieza a desvanecerse a los 750ms y termina de
// quitarse a los 1050ms (ver launch-animation.tsx) — este retraso deja
// que acabe del todo antes de que aparezca el mensaje encima.
const SHOW_DELAY_MS = 1100;

/** Igual que LaunchAnimation: solo una vez por sesión de pestaña, no en
 * cada navegación interna. */
function shouldShowThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return !sessionStorage.getItem(SESSION_KEY);
}

export function WelcomeBanner({ username }: { username: string | null }) {
  const t = useTranslations("WelcomeBanner");
  const [eligible] = useState(shouldShowThisSession);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!eligible || !username) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible, username]);

  if (!visible || !username) return null;

  return (
    <div
      className={
        "bg-card border-border fixed inset-x-4 top-4 z-40 flex items-center justify-between gap-3 rounded-xl border p-3 shadow-lg " +
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-300 " +
        "sm:inset-x-auto sm:left-1/2 sm:w-96 sm:-translate-x-1/2"
      }
    >
      <p className="text-lg font-bold">{t("greeting", { username })}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("dismiss")}
        onClick={() => setVisible(false)}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
