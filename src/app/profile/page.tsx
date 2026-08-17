import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { getMyProfile } from "@/features/community/application/actions";
import { ProfileCard } from "@/features/settings/components/profile-card";
import { formatEventDate } from "@/lib/format-date";
import type { Locale } from "@/core/domain/user-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const { supabase } = await getAuthenticatedUser();
  const [t, locale, profile, userResult] = await Promise.all([
    getTranslations("Profile"),
    getLocale(),
    getMyProfile(),
    supabase.auth.getUser(),
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

      <ProfileCard
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        email={userResult.data.user?.email ?? ""}
        memberSince={formatEventDate(profile.createdAt, locale as Locale)}
      />
    </main>
  );
}
