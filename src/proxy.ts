import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/core/infrastructure/supabase/env";

// Accesibles sin sesión; si el usuario YA está autenticado, se le saca de
// aquí. /reset-password se trata aparte: exige sesión (la que deja la
// propia recuperación de contraseña), así que es una ruta protegida más,
// no pública.
//
// /terms, /privacy, /compartir y /community/join son la excepción a "si hay
// sesión, fuera de aquí": son consultables da igual si has iniciado sesión o
// no (un usuario registrado también quiere poder leer los términos, abrir
// un enlace de compartir, o aceptar una invitación de amistad sin que lo
// mande a inicio), así que además de listarlas aquí se excluyen
// explícitamente de esa segunda condición más abajo.
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/compartir",
  "/community/join",
];
const PUBLIC_ROUTES_ALWAYS_ACCESSIBLE = ["/terms", "/privacy", "/compartir", "/community/join"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() valida el JWT localmente y refresca la sesión si hace
  // falta; nunca usar getSession() aquí, que confía en las cookies sin
  // verificar el token contra Supabase.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!claims && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const isAlwaysAccessible = PUBLIC_ROUTES_ALWAYS_ACCESSIBLE.some((route) =>
    pathname.startsWith(route),
  );
  if (claims && isPublicRoute && !isAlwaysAccessible) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto assets estáticos, PWA (manifest,
     * iconos, service worker), rutas internas de Next y /api (cada endpoint
     * de API gestiona su propia autenticación — p. ej. /api/cron/reminders
     * usa un bearer token fijo, no una sesión de usuario).
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|sw.js|auth/callback|api/).*)",
  ],
};
