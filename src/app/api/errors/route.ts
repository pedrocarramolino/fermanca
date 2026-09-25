import { NextResponse } from "next/server";
import { createClient } from "@/core/infrastructure/supabase/server";
import {
  isErrorReportingEnabled,
  reportError,
} from "@/core/infrastructure/error-reporting/report-error";
import {
  CLIENT_ERROR_KINDS,
  type ClientErrorPayload,
} from "@/lib/error-reporting/client-error-payload";

/** Más que de sobra para un mensaje + traza recortados en el navegador;
 * cualquier cosa mayor no viene de report-client-error.ts. */
const MAX_BODY_BYTES = 20_000;

/**
 * Recibe los errores que le pasan a la gente en el navegador (ver
 * report-client-error.ts). Es público a propósito —un error puede pasar en
 * /login, sin sesión—, y por eso desconfía de lo que le llega: tamaño
 * acotado, solo desde la propia app, y el freno de la base de datos (20
 * correos por hora como mucho) impide que alguien lo use para inundarte el
 * correo aunque se lo proponga.
 */
export async function POST(request: Request) {
  if (!isErrorReportingEnabled()) return new NextResponse(null, { status: 204 });

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let payload: ClientErrorPayload;
  try {
    payload = JSON.parse(raw) as ClientErrorPayload;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (
    typeof payload?.message !== "string" ||
    !payload.message ||
    !CLIENT_ERROR_KINDS.includes(payload.kind)
  ) {
    return new NextResponse(null, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userId = typeof data?.claims.sub === "string" ? data.claims.sub : null;
  } catch {
    // Sin sesión legible se avisa igual, solo que sin saber quién era.
  }

  await reportError({
    source: "client",
    name: typeof payload.name === "string" ? payload.name : "Error",
    message: payload.message,
    stack: typeof payload.stack === "string" ? payload.stack : null,
    path: typeof payload.path === "string" ? payload.path : null,
    kind: payload.kind,
    userId,
    userAgent: request.headers.get("user-agent"),
  });

  return new NextResponse(null, { status: 204 });
}
