import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import {
  averageSessionSeconds,
  categoryBreakdown,
  foldIntoOthers,
  monthlySeries,
  sessionsCount,
  totalPracticedSeconds,
  weeklySeries,
} from "@/core/domain/session-statistics";
import { formatDurationShort } from "@/core/domain/duration";
import { StatTile } from "@/features/statistics/components/stat-tile";
import { WeeklyChart } from "@/features/statistics/components/weekly-chart";
import { MonthlyTrendChart } from "@/features/statistics/components/monthly-trend-chart";
import { CategoryBreakdownChart } from "@/features/statistics/components/category-breakdown-chart";
import type { UserId } from "@/core/domain/ids";

export const metadata: Metadata = { title: "Estadísticas" };

// Suficiente para una app de práctica personal sin necesitar paginación:
// más de esto y probablemente conviene agregarlo en SQL en vez de en memoria.
const MAX_SESSIONS_FOR_STATS = 1000;

export default async function StatisticsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId;

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: MAX_SESSIONS_FOR_STATS });

  const now = new Date();
  const weekly = weeklySeries(sessions, 12, now);
  const monthly = monthlySeries(sessions, 12, now);
  const categories = foldIntoOthers(categoryBreakdown(sessions), 7);

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">Estadísticas</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Tiempo total practicado"
          value={formatDurationShort(totalPracticedSeconds(sessions))}
        />
        <StatTile label="Sesiones realizadas" value={String(sessionsCount(sessions))} />
        <StatTile
          label="Duración media"
          value={
            sessionsCount(sessions) > 0 ? formatDurationShort(averageSessionSeconds(sessions)) : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyChart buckets={weekly} />
        <MonthlyTrendChart buckets={monthly} />
      </div>

      <CategoryBreakdownChart stats={categories} />
    </main>
  );
}
