import { NextResponse } from "next/server";
import { createClient } from "@/core/infrastructure/supabase/server";
import { safeRedirectPath } from "@/features/auth/application/safe-redirect";

/**
 * Destino de los enlaces de email de Supabase (confirmación de registro y
 * recuperación de contraseña): intercambia el código PKCE por una sesión y
 * redirige. `next` decide a dónde (por defecto "/", o "/reset-password"
 * cuando viene de "olvidé mi contraseña").
 *
 * `next` llega como query param del request, no de un valor que la propia
 * app haya generado — pasa por safeRedirectPath por el mismo motivo que en
 * login/register: sin esto, "next=@evil.com" concatenado a `origin` produce
 * "https://fermanca.vercel.app@evil.com", que el navegador interpreta como
 * userinfo@host y redirige de verdad a evil.com.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next") ?? "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
