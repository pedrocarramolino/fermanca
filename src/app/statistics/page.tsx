import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Statistics");
  return { title: t("title") };
}

// Suficiente para una app de práctica personal sin necesitar paginación:
// más de esto y probablemente conviene agregarlo en SQL en vez de en memoria.
const MAX_SESSIONS_FOR_STATS = 1000;

export default async function StatisticsPage() {
  const { supabase, userId } = await getAuthenticatedUser();
  const t = await getTranslations("Statistics");

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: MAX_SESSIONS_FOR_STATS });

  const now = new Date();
  const weekly = weeklySeries(sessions, 12, now);
  const monthly = monthlySeries(sessions, 12, now);
  const categories = foldIntoOthers(categoryBreakdown(sessions), 7, t("categoryOthers"));
  const hasSessions = sessionsCount(sessions) > 0;

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-8 pb-32">
      <AppHeader />

      {hasSessions ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label={t("totalTime")}
              value={formatDurationShort(totalPracticedSeconds(sessions))}
              icon={Clock}
            />
            <StatTile
              label={t("sessionsCount")}
              value={String(sessionsCount(sessions))}
              icon={CalendarCheck}
            />
            <StatTile
              label={t("avgDuration")}
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
          {t("empty")}
        </p>
      )}
    </main>
  );
}
