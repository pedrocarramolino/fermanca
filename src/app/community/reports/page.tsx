import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getMyProfile } from "@/features/community/application/actions";
import { listOpenReports } from "@/features/moderation/application/actions";
import { ReportsReview } from "@/features/moderation/components/reports-review";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reports");
  return { title: t("title") };
}

/** Solo para administradores: las denuncias abiertas. Para cualquier otra
 * persona la página no existe. */
export default async function ReportsPage() {
  const profile = await getMyProfile();
  if (!profile.isAdmin) notFound();

  const [t, reports] = await Promise.all([getTranslations("Reports"), listOpenReports()]);

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("back")}
          render={<Link href="/settings" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">{t("title")}</h1>
      </div>

      <ReportsReview initialReports={reports} />
    </main>
  );
}
