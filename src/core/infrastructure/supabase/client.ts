import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import { getSupabaseEnv } from "@/core/infrastructure/supabase/env";

/** Cliente de Supabase para Client Components. */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}

/**
 * El socket de Realtime no hereda solo el JWT de la sesión por crear el
 * cliente — sin llamar esto antes de suscribirse, el canal se conecta como
 * anónimo y la RLS de cada tabla (todas exigen `auth.uid()`) filtra
 * absolutamente todo: el canal queda "SUBSCRIBED" sin error, pero no llega
 * ningún evento nunca. Llamar siempre antes del primer `.channel(...)`.
 */
export async function authenticateRealtime(client: SupabaseClient<Database>): Promise<void> {
  const { data } = await client.auth.getSession();
  if (data.session?.access_token) {
    client.realtime.setAuth(data.session.access_token);
  }
}
