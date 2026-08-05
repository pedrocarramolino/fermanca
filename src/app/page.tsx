import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SessionBuilder } from "@/features/session-builder/components/session-builder";
import { SessionHistoryItem } from "@/features/history/components/session-history-item";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseCategoryRepository } from "@/core/infrastructure/supabase/repositories/category-repository";
import { SupabaseTemplateRepository } from "@/core/infrastructure/supabase/repositories/template-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";

const RECENT_SESSIONS_PREVIEW = 3;

export default async function Home() {
  const { supabase, userId } = await getAuthenticatedUser();

  const categoryRepo = new SupabaseCategoryRepository(supabase);
  const templateRepo = new SupabaseTemplateRepository(supabase);
  const sessionRepo = new SupabaseSessionRepository(supabase);
  const [categories, templates, recentSessions] = await Promise.all([
    categoryRepo.listAvailable(userId),
    templateRepo.listByOwner(userId),
    sessionRepo.listByOwner(userId, { limit: RECENT_SESSIONS_PREVIEW }),
  ]);

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-8 pb-32">
      <AppHeader />

      <SessionBuilder initialCategories={categories} initialTemplates={templates} />

      {recentSessions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-base font-semibold">Últimas sesiones</h2>
            <Link href="/history" className="text-sm underline underline-offset-4">
              Ver todo
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentSessions.map((session) => (
              <SessionHistoryItem key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
