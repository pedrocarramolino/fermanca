import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { siteConfig } from "@/config/site";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-96x96.png" alt="" className="size-7 rounded-lg" />
        {siteConfig.name}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Personalización"
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
