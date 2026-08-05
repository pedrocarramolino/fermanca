import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseReminderRepository } from "@/core/infrastructure/supabase/repositories/reminder-repository";
import { PushSetup } from "@/features/reminders/components/push-setup";
import { RemindersManager } from "@/features/reminders/components/reminders-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reminders");
  return { title: t("title") };
}

export default async function RemindersPage() {
  const { supabase, userId } = await getAuthenticatedUser();
  const t = await getTranslations("Reminders");

  const repo = new SupabaseReminderRepository(supabase);
  const reminders = await repo.listByOwner(userId);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <AppHeader />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pushCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PushSetup />
        </CardContent>
      </Card>

      <RemindersManager initialReminders={reminders} />
    </main>
  );
}
