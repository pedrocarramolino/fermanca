import "server-only";
import type { Instrumentation } from "next";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { getSupabaseEnv } from "@/core/infrastructure/supabase/env";
import {
  isErrorReportingEnabled,
  reportError,
} from "@/core/infrastructure/error-reporting/report-error";

type RequestErrorArgs = Parameters<Instrumentation.onRequestError>;

/** Cuánto como mucho se espera a saber quién era la persona antes de
 * mandar el aviso sin ese dato. */
const USER_LOOKUP_TIMEOUT_MS = 3_000;

/**
 * Adapta lo que entrega `onRequestError` (instrumentation.ts) a un aviso.
 * Next ya filtra antes de llamarlo los "errores" que no lo son —notFound(),
 * redirect(), peticiones canceladas—, así que todo lo que llega aquí es un
 * fallo de verdad.
 */
export async function reportServerRequestError(...[err, request, context]: RequestErrorArgs) {
  if (!isErrorReportingEnabled()) return;

  const error = err instanceof Error ? err : new Error(String(err));
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : null;
  const header = (name: string) => {
    const value = request.headers[name];
    return Array.isArray(value) ? value.join("; ") : (value ?? null);
  };

  await reportError({
    source: "server",
    name: error.name,
    message: error.message,
    stack: error.stack ?? null,
    path: request.path,
    route: context.routePath,
    kind: context.routeType,
    userId: await userIdFromCookies(header("cookie")),
    userAgent: header("user-agent"),
    digest,
  });
}

/** Aquí no hay `cookies()` de Next (no es un Server Component ni una
 * acción), así que se monta el cliente de Supabase a mano con la cabecera
 * Cookie de la petición que falló. Solo lee: `setAll` no hace nada. */
async function userIdFromCookies(cookieHeader: string | null): Promise<string | null> {
  if (!cookieHeader) return null;
  try {
    const { url, anonKey } = getSupabaseEnv();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () =>
          parseCookieHeader(cookieHeader).map(({ name, value }) => ({ name, value: value ?? "" })),
        setAll: () => {},
      },
    });
    const claims = await Promise.race([
      supabase.auth.getClaims().then(({ data }) => data?.claims ?? null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), USER_LOOKUP_TIMEOUT_MS)),
    ]);
    return typeof claims?.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}
