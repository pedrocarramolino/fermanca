import Link from "next/link";
import { BarChart2, Bell, Flame, History, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { SessionBuilder } from "@/features/session-builder/components/session-builder";
import { siteConfig } from "@/config/site";
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
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <span className="font-semibold tracking-tight">{siteConfig.name}</span>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <Menu className="size-4" />
              Menú
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href="/statistics" />}>
                <BarChart2 className="size-4" />
                Estadísticas
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/history" />}>
                <History className="size-4" />
                Historial
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/streaks" />}>
                <Flame className="size-4" />
                Rachas
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/reminders" />}>
                <Bell className="size-4" />
                Recordatorios
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings className="size-4" />
                Personalización
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <SessionBuilder initialCategories={categories} initialTemplates={templates} />
    </main>
  );
}
