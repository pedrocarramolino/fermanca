import { AppHeader } from "@/components/app-header";
import { SessionBuilder } from "@/features/session-builder/components/session-builder";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseCategoryRepository } from "@/core/infrastructure/supabase/repositories/category-repository";
import { SupabaseTemplateRepository } from "@/core/infrastructure/supabase/repositories/template-repository";

export default async function Home() {
  const { supabase, userId } = await getAuthenticatedUser();

  const categoryRepo = new SupabaseCategoryRepository(supabase);
  const templateRepo = new SupabaseTemplateRepository(supabase);
  const [categories, templates] = await Promise.all([
    categoryRepo.listAvailable(userId),
    templateRepo.listByOwner(userId),
  ]);

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-8 pb-32">
      <AppHeader />

      <SessionBuilder initialCategories={categories} initialTemplates={templates} />
    </main>
  );
}
