import Link from "next/link";
import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { siteConfig } from "@/config/site";
import { getCurrentUserProfile } from "@/core/infrastructure/supabase/current-user";

export async function AppHeader() {
  const [t, profile] = await Promise.all([
    getTranslations("Common"),
    getCurrentUserProfile().catch(() => null),
  ]);

  return (
    <header className="glass:bg-[color-mix(in_oklch,var(--background)_calc(var(--glass-alpha-light,70%)_-_20%),transparent)] glass:[backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)_url(#liquid-glass-distortion)] glass:[-webkit-backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)] glass:-mx-3 glass:rounded-2xl glass:px-3 glass:py-2 minimal:border-b minimal:border-border/50 minimal:pb-2 futuristic:border-b futuristic:border-primary/40 futuristic:shadow-[0_12px_24px_-16px_var(--primary)] futuristic:pb-2 flex items-center justify-between">
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-96x96.png" alt="" className="size-7 rounded-lg" />
        {siteConfig.name}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          aria-label={t("profileAriaLabel")}
          className="border-border bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border"
        >
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-xs font-medium">
              {profile?.username.slice(0, 2).toUpperCase() ?? ""}
            </span>
          )}
        </Link>
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
