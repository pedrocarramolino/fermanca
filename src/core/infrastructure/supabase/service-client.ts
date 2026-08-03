import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/core/infrastructure/supabase/database.types";

/**
 * Cliente con la clave secreta (bypassa RLS): solo para trabajos de
 * servidor de confianza (el cron de recordatorios) que necesitan ver datos
 * de todos los usuarios. Nunca importar desde código que llegue al
 * navegador — el import de "server-only" hace que el build falle si eso
 * pasa por error.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
