"use server";

import { createClient } from "@/core/infrastructure/supabase/server";
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
