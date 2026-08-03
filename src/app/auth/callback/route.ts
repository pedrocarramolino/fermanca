import { NextResponse } from "next/server";
import { createClient } from "@/core/infrastructure/supabase/server";

/**
 * Destino de los enlaces de email de Supabase (confirmación de registro y
 * recuperación de contraseña): intercambia el código PKCE por una sesión y
 * redirige. `next` decide a dónde (por defecto "/", o "/reset-password"
 * cuando viene de "olvidé mi contraseña").
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
