import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Rachas" };

const MAX_SESSIONS_FOR_STREAKS = 1000;
const HEATMAP_WEEKS = 26;

export default async function StreaksPage() {
  const { supabase, userId } = await getAuthenticatedUser();

  const repo = new SupabaseSessionRepository(supabase);
  const sessions = await repo.listByOwner(userId, { limit: MAX_SESSIONS_FOR_STREAKS });

  const now = new Date();
  const byDay = practiceSecondsByDay(sessions);
  const compliance = weeklyCompliance(byDay, now);
  const heatmapWeeks = activityHeatmap(byDay, HEATMAP_WEEKS, now);
  const hasData = byDay.size > 0;

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <AppHeader />

      {hasData ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Racha actual"
              value={`${currentStreakDays(byDay, now)} días`}
              icon={Flame}
            />
            <StatTile
              label="Mejor racha histórica"
              value={`${bestStreakDays(byDay)} días`}
              icon={Award}
            />
            <StatTile
              label="Cumplimiento semanal"
              value={`${compliance.percentage}%`}
              icon={Percent}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calendario de actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap weeks={heatmapWeeks} />
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Todavía no has completado ninguna sesión. Empieza una desde el inicio para empezar tu
          racha.
        </p>
      )}
    </main>
  );
}
