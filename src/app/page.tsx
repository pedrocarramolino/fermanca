import { AppHeader } from "@/components/app-header";
import { SessionBuilder } from "@/features/session-builder/components/session-builder";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseCategoryRepository } from "@/core/infrastructure/supabase/repositories/category-repository";
import { SupabaseTemplateRepository } from "@/core/infrastructure/supabase/repositories/template-repository";
import type { UserId } from "@/core/domain/ids";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId;

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
