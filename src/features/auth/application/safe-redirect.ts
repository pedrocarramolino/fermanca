/**
 * `next` viene de un query param controlado por quien construye el enlace
 * de login/callback, no del propio usuario — "/login?next=//evil.com" o
 * "next=@evil.com" pasan como texto cualquiera si no se valida, y acaban
 * en una URL con otro origen ("//evil.com" es protocol-relative;
 * "@evil.com" tras el origen se interpreta como userinfo@host). Bloquear
 * todo lo que no empiece por "/" (y "//" aparte, que sí empieza por "/")
 * evita el open redirect tras un login o una confirmación de email legítimos.
 *
 * Función aparte (no en application/actions.ts): ese archivo lleva "use
 * server", y ahí solo pueden vivir funciones async — esta la necesitan
 * tanto esa Server Action como /auth/callback/route.ts, que no lo es.
 */
export function safeRedirectPath(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
