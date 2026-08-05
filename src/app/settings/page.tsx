import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUserSettings } from "@/core/infrastructure/supabase/current-user";
import { getMyProfile } from "@/features/community/application/actions";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { DeleteAccountCard } from "@/features/settings/components/delete-account-card";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const [settings, profile] = await Promise.all([getCurrentUserSettings(), getMyProfile()]);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">Ajustes</h1>
      </div>

      <SettingsForm initialSettings={settings} />

      <DeleteAccountCard username={profile.username} />
    </main>
  );
}
