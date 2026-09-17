import Link from "next/link";
import type { ReactNode } from "react";
import { CircleUserRound, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export async function AppHeader({
  beforeActions,
}: {
  /** Icono(s) extra antes de perfil/configuración — p. ej. los anuncios en
   * la cabecera de Comunidad. Nada por defecto, así el resto de páginas no
   * se ven afectadas. */
  beforeActions?: ReactNode;
} = {}) {
  const t = await getTranslations("Common");

  return (
    <header className="glass:bg-[color-mix(in_oklch,var(--background)_calc(var(--glass-alpha-light,70%)_-_20%),transparent)] glass:[backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)_url(#liquid-glass-distortion)] glass:[-webkit-backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)] glass:-mx-3 glass:rounded-2xl glass:px-3 glass:py-2 flex items-center justify-between">
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-96x96.png" alt="" className="size-7 rounded-lg" />
        {siteConfig.name}
      </span>
      <div className="flex items-center gap-2">
        {beforeActions}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("profileAriaLabel")}
          render={<Link href="/profile" />}
          nativeButton={false}
        >
          <CircleUserRound className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("settingsAriaLabel")}
          render={<Link href="/settings" />}
          nativeButton={false}
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </header>
  );
}
