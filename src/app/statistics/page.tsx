import type { Metadata } from "next";
import { CalendarCheck, Clock, Hourglass } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
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

export const metadata: Metadata = { title: "Estadísticas" };

// Suficiente para una app de práctica personal sin necesitar paginación:
// más de esto y probablemente conviene agregarlo en SQL en vez de en memoria.
const MAX_SESSIONS_FOR_STATS = 1000;

export default async function StatisticsPage() {
  const { supabase, userId } = await getAuthenticatedUser();

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: MAX_SESSIONS_FOR_STATS });

  const now = new Date();
  const weekly = weeklySeries(sessions, 12, now);
  const monthly = monthlySeries(sessions, 12, now);
  const categories = foldIntoOthers(categoryBreakdown(sessions), 7);
  const hasSessions = sessionsCount(sessions) > 0;

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-8 pb-32">
      <AppHeader />

      {hasSessions ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Tiempo total practicado"
              value={formatDurationShort(totalPracticedSeconds(sessions))}
              icon={Clock}
            />
            <StatTile
              label="Sesiones realizadas"
              value={String(sessionsCount(sessions))}
              icon={CalendarCheck}
            />
            <StatTile
              label="Duración media"
              value={formatDurationShort(averageSessionSeconds(sessions))}
              icon={Hourglass}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <WeeklyChart buckets={weekly} />
            <MonthlyTrendChart buckets={monthly} />
          </div>

          <CategoryBreakdownChart stats={categories} />
        </>
      ) : (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Todavía no has completado ninguna sesión. Empieza una desde el inicio para ver tus
          estadísticas aquí.
        </p>
      )}
    </main>
  );
}
