import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseReminderRepository } from "@/core/infrastructure/supabase/repositories/reminder-repository";
import { SupabaseCalendarEventRepository } from "@/core/infrastructure/supabase/repositories/calendar-event-repository";
import { PushSetup } from "@/features/reminders/components/push-setup";
import { RemindersManager } from "@/features/reminders/components/reminders-manager";
import { CalendarEventsManager } from "@/features/reminders/components/calendar-events-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reminders");
  return { title: t("title") };
}

export default async function RemindersPage() {
  const { supabase, userId } = await getAuthenticatedUser();
  const t = await getTranslations("Reminders");

  const reminderRepo = new SupabaseReminderRepository(supabase);
  const calendarEventRepo = new SupabaseCalendarEventRepository(supabase);
  const [reminders, calendarEvents] = await Promise.all([
    reminderRepo.listByOwner(userId),
    calendarEventRepo.listByOwner(userId),
  ]);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <AppHeader />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pushCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PushSetup />
        </CardContent>
      </Card>

      <CalendarEventsManager initialEvents={calendarEvents} />

      <RemindersManager initialReminders={reminders} />
    </main>
  );
}
