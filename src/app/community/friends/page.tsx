import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { listFriendsWithProgress } from "@/features/community/application/actions";
import { FriendsPageClient } from "@/features/community/components/friends-page-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Community.friends");
  return { title: t("title") };
}

export default async function FriendsPage() {
  const t = await getTranslations("Community.friends");
  const friends = await listFriendsWithProgress();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("back")}
          render={<Link href="/community" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">{t("title")}</h1>
      </div>

      <FriendsPageClient initialFriends={friends} />
    </main>
  );
}
