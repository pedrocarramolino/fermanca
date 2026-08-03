import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import { getSupabaseEnv } from "@/core/infrastructure/supabase/env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. `setAll` puede fallar si se llama desde un Server Component
 * puro (sin Server Action/middleware de por medio) — se ignora a
 * propósito, ya que el middleware de sesión se encarga de refrescar las
 * cookies (se añade en la fase de autenticación).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ver comentario de la función.
        }
      },
    },
  });
}
