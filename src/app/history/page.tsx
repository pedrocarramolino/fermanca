import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";
import { HistoryList } from "@/features/history/components/history-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("History");
  return { title: t("title") };
}

export default async function HistoryPage() {
  const { supabase, userId } = await getAuthenticatedUser();
  const t = await getTranslations("History");

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: HISTORY_PAGE_SIZE });

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

      <HistoryList initialSessions={sessions} />
    </main>
  );
}
