"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";
import { updateSettings } from "@/features/settings/application/actions";

export function ThemeToggle() {
  const t = useTranslations("Common");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    void updateSettings({ theme: next });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("toggleTheme")}
      disabled={!mounted}
      onClick={toggle}
    >
      {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
