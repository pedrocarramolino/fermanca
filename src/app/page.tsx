import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { HomeGreeting } from "@/components/home-greeting";
import { LandingPage } from "@/components/landing-page";
import { SessionBuilder } from "@/features/session-builder/components/session-builder";
import {
  getAuthenticatedUser,
  getCurrentUserProfile,
} from "@/core/infrastructure/supabase/current-user";
import { SupabaseCategoryRepository } from "@/core/infrastructure/supabase/repositories/category-repository";
import { SupabaseTemplateRepository } from "@/core/infrastructure/supabase/repositories/template-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { SupabaseWeeklyGoalRepository } from "@/core/infrastructure/supabase/repositories/weekly-goal-repository";
import { currentWeekStartKey, weeklyGoalProgress } from "@/core/domain/weekly-goal";
import { mondayOf } from "@/core/domain/streaks";
import { WeeklyGoalCard } from "@/features/weekly-goals/components/weekly-goal-card";
import { ActiveSessionCard } from "@/features/session-timer/components/active-session-card";
import { FeedList } from "@/features/feed/components/feed-list";
import { listFeed } from "@/features/feed/application/actions";

const RECENT_SESSIONS_PREVIEW = 3;

export default async function Home() {
  const { supabase, userId } = await getAuthenticatedUser();

  // Sin sesión, "/" es la única página con contenido público de verdad que
  // un buscador puede indexar (ver robots.ts/sitemap.ts) — antes se
  // renderizaba igual el panel de la app, vacío y roto para quien no tiene
  // cuenta todavía.
  if (!userId) return <LandingPage />;

  const tCommon = await getTranslations("Common");

  const categoryRepo = new SupabaseCategoryRepository(supabase);
  const templateRepo = new SupabaseTemplateRepository(supabase);
  const sessionRepo = new SupabaseSessionRepository(supabase);
  const weeklyGoalRepo = new SupabaseWeeklyGoalRepository(supabase);
  const [categories, templates, recentSessions, profile, weeklyGoal, feedShares] = await Promise.all([
    categoryRepo.listAvailable(userId),
    templateRepo.listByOwner(userId),
    sessionRepo.listByOwner(userId, { limit: RECENT_SESSIONS_PREVIEW }),
    getCurrentUserProfile().catch(() => null),
    weeklyGoalRepo.getForWeek(userId, currentWeekStartKey(new Date())),
    listFeed(),
  ]);

  // Solo hace falta traer las sesiones de esta semana si hay un objetivo que
  // comparar contra ellas.
  const weeklyProgress = weeklyGoal
    ? weeklyGoalProgress(
        await sessionRepo.listByOwner(userId, { from: mondayOf(new Date()) }),
        weeklyGoal,
      )
    : null;

  // La única sesión reciente que sigue interesando aquí es la que está sin
  // terminar (ActiveSessionCard) — el resto de "últimas sesiones" se movió
  // al final de Estadísticas, y este hueco de Inicio pasó a ser el Feed.
  const activeSession = recentSessions.find((session) => session.status === "in_progress");

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-8 pb-32 lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <AppHeader />

      <HomeGreeting username={profile?.username ?? null} />

      <WeeklyGoalCard initialGoal={weeklyGoal} progress={weeklyProgress} />

      {activeSession && <ActiveSessionCard session={activeSession} />}

      <SessionBuilder initialCategories={categories} initialTemplates={templates} />

      <FeedList initialEntries={feedShares} currentUserId={userId} />

      <p className="text-muted-foreground text-center text-xs">
        {tCommon("footerCredit", { year: new Date().getFullYear() })}
      </p>
    </main>
  );
}
