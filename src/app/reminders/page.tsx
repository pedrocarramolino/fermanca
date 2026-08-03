import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseReminderRepository } from "@/core/infrastructure/supabase/repositories/reminder-repository";
import { PushSetup } from "@/features/reminders/components/push-setup";
import { RemindersManager } from "@/features/reminders/components/reminders-manager";
import type { UserId } from "@/core/domain/ids";

export const metadata: Metadata = { title: "Recordatorios" };

export default async function RemindersPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId;

  const repo = new SupabaseReminderRepository(supabase);
  const reminders = await repo.listByOwner(userId);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <AppHeader />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notificaciones en este dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <PushSetup />
        </CardContent>
      </Card>

      <RemindersManager initialReminders={reminders} />
    </main>
  );
}
