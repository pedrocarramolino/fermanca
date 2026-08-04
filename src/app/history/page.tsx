import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";
import { HistoryList } from "@/features/history/components/history-list";

export const metadata: Metadata = { title: "Historial" };

export default async function HistoryPage() {
  const { supabase, userId } = await getAuthenticatedUser();

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: HISTORY_PAGE_SIZE });

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <AppHeader />

      <HistoryList initialSessions={sessions} />
    </main>
  );
}
