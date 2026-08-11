import Link from "next/link";
import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { siteConfig } from "@/config/site";

export async function AppHeader() {
  const t = await getTranslations("Common");

  return (
    <header className="glass:bg-[color-mix(in_oklch,var(--background)_calc(var(--glass-alpha-light,70%)_-_20%),transparent)] glass:backdrop-blur-[var(--glass-blur,40px)] glass:backdrop-saturate-150 glass:-mx-3 glass:rounded-2xl glass:px-3 glass:py-2 minimal:border-b minimal:border-border/50 minimal:pb-2 futuristic:border-b futuristic:border-primary/40 futuristic:shadow-[0_12px_24px_-16px_var(--primary)] futuristic:pb-2 flex items-center justify-between">
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-96x96.png" alt="" className="size-7 rounded-lg" />
        {siteConfig.name}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("settingsAriaLabel")}
          render={<Link href="/settings" />}
          nativeButton={false}
        >
          <Settings className="size-4" />
        </Button>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
