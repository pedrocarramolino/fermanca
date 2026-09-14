import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { getGroupDetail } from "@/features/groups/application/actions";
import { GroupDetail } from "@/features/groups/components/group-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const group = await getGroupDetail(id);
    return { title: group.name };
  } catch {
    const t = await getTranslations("Groups");
    return { title: t("title") };
  }
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("Groups.detail");
  const { userId } = await getAuthenticatedUser();

  const group = await getGroupDetail(id).catch(() => null);
  if (!group) notFound();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("back")}
        render={<Link href="/community/groups" />}
        nativeButton={false}
        className="self-start"
      >
        <ArrowLeft className="size-4" />
      </Button>

      <GroupDetail group={group} myOwnerId={userId} />
    </main>
  );
}
