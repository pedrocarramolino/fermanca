import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { HomeGreeting } from "@/components/home-greeting";
import { SessionBuilder } from "@/features/session-builder/components/session-builder";
import { SessionHistoryItem } from "@/features/history/components/session-history-item";
import {
  getAuthenticatedUser,
  getCurrentUserProfile,
} from "@/core/infrastructure/supabase/current-user";
import { SupabaseCategoryRepository } from "@/core/infrastructure/supabase/repositories/category-repository";
import { SupabaseTemplateRepository } from "@/core/infrastructure/supabase/repositories/template-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";

const RECENT_SESSIONS_PREVIEW = 3;

export default async function Home() {
  const { supabase, userId } = await getAuthenticatedUser();
  const [t, tCommon] = await Promise.all([getTranslations("Home"), getTranslations("Common")]);

  const categoryRepo = new SupabaseCategoryRepository(supabase);
  const templateRepo = new SupabaseTemplateRepository(supabase);
  const sessionRepo = new SupabaseSessionRepository(supabase);
  const [categories, templates, recentSessions, profile] = await Promise.all([
    categoryRepo.listAvailable(userId),
    templateRepo.listByOwner(userId),
    sessionRepo.listByOwner(userId, { limit: RECENT_SESSIONS_PREVIEW }),
    getCurrentUserProfile().catch(() => null),
  ]);

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-8 pb-32 lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <AppHeader />

      <HomeGreeting username={profile?.username ?? null} />

      <SessionBuilder initialCategories={categories} initialTemplates={templates} />

      {recentSessions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-base font-semibold">{t("recentSessions")}</h2>
            <Link href="/history" className="text-sm underline underline-offset-4">
              {t("viewAll")}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentSessions.map((session) => (
              <SessionHistoryItem key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      <p className="text-muted-foreground text-center text-xs">
        {tCommon("footerCredit", { year: new Date().getFullYear() })}
      </p>
    </main>
  );
}
