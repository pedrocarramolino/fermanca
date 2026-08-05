"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { UserSettings } from "@/core/domain/user-settings";
import type { UserId } from "@/core/domain/ids";

export async function updateSettings(
  changes: Partial<Omit<UserSettings, "ownerId">>,
): Promise<UserSettings> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();

  const repo = new SupabaseUserSettingsRepository(supabase);
  return repo.upsert(sub as UserId, changes);
}

/**
 * Borra la cuenta y, con ella, todo lo demás: sesiones, plantillas,
 * categorías propias, amistades, recordatorios y suscripciones push cuelgan
 * de auth.users con "on delete cascade" (ver las migraciones), así que
 * borrar el usuario con la clave de servicio se los lleva por delante sin
 * tener que borrar tabla por tabla. No hay vuelta atrás.
 */
export async function deleteMyAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const { error } = await createServiceClient().auth.admin.deleteUser(userId);
  if (error) throw error;

  await supabase.auth.signOut();
  redirect("/login");
}
