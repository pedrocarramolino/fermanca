import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import { SettingsForm } from "@/features/settings/components/settings-form";
import type { UserId } from "@/core/domain/ids";

export const metadata: Metadata = { title: "Personalización" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId;

  const repo = new SupabaseUserSettingsRepository(supabase);
  const settings = await repo.get(userId);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">Personalización</h1>
      </div>

      <SettingsForm initialSettings={settings} />
    </main>
  );
}
