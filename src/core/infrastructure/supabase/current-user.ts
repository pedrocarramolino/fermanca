import { cache } from "react";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import type { UserId } from "@/core/domain/ids";

/**
 * `getClaims()` verifica el JWT y crea el cliente de Supabase — antes cada
 * Server Component (layout raíz + cada página) lo hacía por su cuenta,
 * duplicando esa comprobación en cada navegación. `React.cache()` memoiza
 * por petición: la primera llamada (siempre la del layout, que se resuelve
 * primero) hace el trabajo real, y el resto de llamadas durante esa misma
 * petición reciben el resultado ya calculado, sin repetirlo.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub as UserId;
  return { supabase, userId };
});

/**
 * El layout raíz (accento/tema), /settings y la sesión en marcha piden los
 * mismos ajustes del usuario en la misma petición — cacheado igual que
 * getAuthenticatedUser para no repetir la consulta tres veces.
 */
export const getCurrentUserSettings = cache(async () => {
  const { supabase, userId } = await getAuthenticatedUser();
  return new SupabaseUserSettingsRepository(supabase).get(userId);
});
