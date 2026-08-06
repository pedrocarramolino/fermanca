import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { AuthLocaleSwitcher } from "@/features/auth/components/auth-locale-switcher";
import { siteConfig } from "@/config/site";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Common");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <span className="flex flex-col items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-128x128.png" alt="" className="size-14 rounded-2xl" />
        {siteConfig.name}
      </span>
      <Card className="w-full max-w-sm">
        <CardContent>{children}</CardContent>
      </Card>
      <AuthLocaleSwitcher />
      <p className="text-muted-foreground text-center text-xs">
        {t("footerCredit", { year: new Date().getFullYear() })}
      </p>
    </main>
  );
}
