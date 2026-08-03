import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import { getSupabaseEnv } from "@/core/infrastructure/supabase/env";

/** Cliente de Supabase para Client Components. */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
