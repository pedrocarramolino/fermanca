import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { FeedList } from "@/features/feed/components/feed-list";
import { listFeed } from "@/features/feed/application/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Feed");
  return { title: t("title") };
}

/** El Feed vivía dentro de Inicio, que se hacía larguísimo (saludo, objetivo
 * semanal, constructor de sesiones Y todas las publicaciones). Ahora tiene su
 * propia pestaña, en el hueco que dejó Avisos al subir a la cabecera. */
export default async function FeedPage() {
  const { userId } = await getAuthenticatedUser();
  const entries = await listFeed();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <AppHeader />
      <FeedList initialEntries={entries} currentUserId={userId} />
    </main>
  );
}
