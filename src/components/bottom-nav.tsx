"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Flame, Home, LineChart, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/statistics", key: "statistics", icon: LineChart },
  { href: "/community", key: "community", icon: Users },
  { href: "/streaks", key: "streaks", icon: Flame },
  { href: "/reminders", key: "reminders", icon: Bell },
] as const;

/**
 * Barra de navegación flotante "Liquid Glass" (estilo Apple: vidrio
 * esmerilado translúcido con un realce especular en el borde superior).
 * Oculta durante una sesión en marcha (/session/*) para no distraer — igual
 * que Apple Fitness oculta su tab bar durante un entrenamiento activo.
 */
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  if (pathname.startsWith("/session/")) return null;

  return (
    <nav
      className="fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-[28px] p-1.5",
          "bg-background/70 dark:bg-background/50",
          "ring-border/60 shadow-[0_8px_32px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.35)] ring-1",
          "backdrop-blur-2xl backdrop-saturate-150 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
        )}
      >
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const label = t(key);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-15 flex-col items-center gap-0.5 rounded-3xl px-3 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className="size-5"
                strokeWidth={active ? 2.4 : 2}
                fill={active ? "currentColor" : "none"}
                fillOpacity={active ? 0.15 : 0}
              />
              <span className="text-[10px] leading-none font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
