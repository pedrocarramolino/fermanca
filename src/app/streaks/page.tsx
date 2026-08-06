import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Award, Flame, Percent } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import {
  activityHeatmap,
  bestStreakDays,
  currentStreakDays,
  practiceSecondsByDay,
  weeklyCompliance,
} from "@/core/domain/streaks";
import { StatTile } from "@/features/statistics/components/stat-tile";
import { ActivityHeatmap } from "@/features/streaks/components/activity-heatmap";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Streaks");
  return { title: t("title") };
}

const MAX_SESSIONS_FOR_STREAKS = 1000;
const HEATMAP_WEEKS = 26;

export default async function StreaksPage() {
  const { supabase, userId } = await getAuthenticatedUser();
  const t = await getTranslations("Streaks");

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: MAX_SESSIONS_FOR_STREAKS });

  const now = new Date();
  const byDay = practiceSecondsByDay(sessions);
  const compliance = weeklyCompliance(byDay, now);
  const heatmapWeeks = activityHeatmap(byDay, HEATMAP_WEEKS, now);
  const hasData = byDay.size > 0;

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <AppHeader />

      {hasData ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label={t("current")}
              value={t("days", { count: currentStreakDays(byDay, now) })}
              icon={Flame}
            />
            <StatTile
              label={t("best")}
              value={t("days", { count: bestStreakDays(byDay) })}
              icon={Award}
            />
            <StatTile
              label={t("weeklyCompliance")}
              value={`${compliance.percentage}%`}
              icon={Percent}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("activityCalendar")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap weeks={heatmapWeeks} />
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      )}
    </main>
  );
}
