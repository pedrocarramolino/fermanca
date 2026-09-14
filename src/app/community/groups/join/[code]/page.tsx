import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { getGroupByInviteCode } from "@/features/groups/application/actions";
import { JoinGroupByCodeClient } from "@/features/groups/components/join-group-by-code-client";
import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Groups.joinLink");
  return { title: t("metaTitle") };
}

export default async function JoinGroupByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const t = await getTranslations("Groups.joinLink");

  // Sin autenticación a propósito: quien abre el enlace puede no tener
  // cuenta todavía — mismo patrón que community/join/[code].
  const [group, { userId }] = await Promise.all([
    getGroupByInviteCode(code),
    getAuthenticatedUser(),
  ]);

  if (!group) {
    return (
      <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">{t("invalidTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("invalidDescription")}</p>
        <Button render={<Link href="/" />} nativeButton={false}>
          {t("goToApp")}
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-6 p-8 text-center">
      <Link href="/" className="flex flex-col items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-128x128.png" alt="" className="size-14 rounded-2xl" />
        {siteConfig.name}
      </Link>

      <JoinGroupByCodeClient code={code} groupName={group.name} authenticated={!!userId} />
    </main>
  );
}
