import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";
import { HistoryList } from "@/features/history/components/history-list";
import type { UserId } from "@/core/domain/ids";

export const metadata: Metadata = { title: "Historial" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId;

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: HISTORY_PAGE_SIZE });

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <AppHeader />

      <HistoryList initialSessions={sessions} />
    </main>
  );
}
