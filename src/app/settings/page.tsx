import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getCurrentUserSettings } from "@/core/infrastructure/supabase/current-user";
import { getMyProfile } from "@/features/community/application/actions";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { DeleteAccountCard } from "@/features/settings/components/delete-account-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const [settings, profile] = await Promise.all([getCurrentUserSettings(), getMyProfile()]);
  const [t, tCommon] = await Promise.all([
    getTranslations("Settings"),
    getTranslations("Common"),
  ]);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("back")}
          render={<Link href="/" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">{t("title")}</h1>
      </div>

      <SettingsForm initialSettings={settings} />

      <DeleteAccountCard username={profile.username} />

      <p className="text-muted-foreground text-center text-xs">
        {tCommon("footerCredit", { year: new Date().getFullYear() })}
      </p>
    </main>
  );
}
