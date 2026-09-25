import "server-only";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { siteConfig } from "@/config/site";

/**
 * Avisos por correo cuando algo falla en la app.
 *
 * Todo error —del servidor (instrumentation.ts) o del navegador de alguien
 * (/api/errors)— pasa por `reportError`, que:
 *   1. lo apunta en `app_errors`, agrupado por su huella: el mismo fallo
 *      repetido es una fila con un contador, no mil filas;
 *   2. pregunta a esa misma función de la base de datos si toca avisar
 *      (como mucho un correo por hora por error y 20 por hora en total,
 *      ver la migración app_errors), y
 *   3. si toca, manda el correo por Resend.
 *
 * Nunca lanza: un fallo aquí dentro no puede tapar ni empeorar el error
 * original que se estaba intentando avisar. Como mucho lo deja en el log.
 *
 * Solo se activa si están RESEND_API_KEY y ERROR_ALERT_EMAIL. En Vercel
 * existen solo para producción, así que ni las previews ni el `next dev`
 * de nadie mandan correos ni ensucian la tabla con errores de pruebas.
 */

export type ErrorSource = "server" | "client";

export interface ErrorReport {
  source: ErrorSource;
  /** `TypeError`, `Error`… */
  name: string;
  message: string;
  stack?: string | null;
  /** Ruta que estaba abriendo la persona, p. ej. `/community`. */
  path?: string | null;
  /** Archivo de ruta de Next (`/community/page`) — solo lo sabe el servidor. */
  route?: string | null;
  /** En qué momento: render/route/action/proxy (servidor) o
   * boundary/global/unhandled (navegador). */
  kind?: string | null;
  userId?: string | null;
  userAgent?: string | null;
  digest?: string | null;
}

const MAX_MESSAGE = 1_000;
const MAX_STACK = 8_000;
const MAX_PATH = 500;
const MAX_USER_AGENT = 300;

const DEFAULT_FROM = "Fermança <onboarding@resend.dev>";

export function isErrorReportingEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ERROR_ALERT_EMAIL);
}

export async function reportError(report: ErrorReport): Promise<void> {
  if (!isErrorReportingEnabled()) return;
  try {
    const clean = sanitize(report);
    const fingerprint = await fingerprintOf(clean);
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .rpc("record_app_error", {
        p_fingerprint: fingerprint,
        p_source: clean.source,
        p_message: `${clean.name}: ${clean.message}`,
        p_stack: clean.stack ?? null,
        p_path: clean.path ?? null,
        p_route: clean.route ?? null,
        p_context: {
          kind: clean.kind ?? null,
          userAgent: clean.userAgent ?? null,
          digest: clean.digest ?? null,
        },
        p_user_id: clean.userId ?? null,
      })
      .single();
    if (error) throw error;
    if (!data.should_email) return;

    let username: string | null = null;
    if (clean.userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("owner_id", clean.userId)
        .maybeSingle();
      username = profile?.username ?? null;
    }

    await sendAlertEmail(clean, {
      occurrences: data.occurrences,
      firstSeenAt: new Date(data.first_seen_at),
      username,
    });
  } catch (err) {
    console.error("[error-reporting] No se pudo registrar o avisar del error:", err);
  }
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function sanitize(report: ErrorReport): ErrorReport {
  return {
    ...report,
    name: truncate(report.name, 100) ?? "Error",
    message: truncate(report.message, MAX_MESSAGE) ?? "(sin mensaje)",
    stack: truncate(report.stack, MAX_STACK),
    path: truncate(report.path, MAX_PATH),
    route: truncate(report.route, MAX_PATH),
    userAgent: truncate(report.userAgent, MAX_USER_AGENT),
  };
}

/** Quita de un texto lo que cambia de una vez a otra sin que cambie el
 * fallo (ids, números, hashes): así "no existe la sesión 8f3a…" y "no existe
 * la sesión 91bc…" cuentan como el mismo error y no mandan dos correos. */
function normalize(text: string): string {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":uuid")
    .replace(/\b[0-9a-f]{16,}\b/gi, ":hash")
    .replace(/\d+/g, ":n");
}

async function fingerprintOf(report: ErrorReport): Promise<string> {
  // En el servidor el archivo de ruta ya es estable; en el navegador solo
  // hay la URL, que se normaliza igual que el mensaje (/grupos/:uuid).
  const where = report.route ?? (report.path ? normalize(report.path.split("?")[0]!) : "");
  const key = [report.source, report.name, normalize(report.message), where].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const KIND_LABELS: Record<string, string> = {
  render: "al cargar la página (servidor)",
  route: "en una ruta de API (servidor)",
  action: "al guardar o enviar algo (acción del servidor)",
  proxy: "al comprobar la sesión (proxy)",
  boundary: "en el navegador — le salió la pantalla «Algo ha ido mal»",
  global: "en el navegador — la app entera dejó de funcionar",
  unhandled: "en el navegador — sin pantalla de error",
};

function formatMadrid(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendAlertEmail(
  report: ErrorReport,
  meta: { occurrences: number; firstSeenAt: Date; username: string | null },
): Promise<void> {
  const where = report.path ?? report.route ?? "(ruta desconocida)";
  const who = report.userId
    ? (meta.username ?? `usuario ${report.userId}`)
    : "alguien sin sesión iniciada";
  const when = formatMadrid(new Date());
  const repeats =
    meta.occurrences <= 1
      ? "Primera vez que pasa."
      : `Se ha repetido ${meta.occurrences} veces desde el ${formatMadrid(meta.firstSeenAt)}.`;
  const how = report.kind ? (KIND_LABELS[report.kind] ?? report.kind) : null;

  const rows: [string, string][] = [
    ["Qué", `${report.name}: ${report.message}`],
    ["Dónde", where + (report.route && report.route !== where ? `  (${report.route})` : "")],
    ...(how ? ([["Cómo", how]] as [string, string][]) : []),
    ["Quién", who],
    ["Cuándo", `${when} (hora de Madrid)`],
    ["Veces", repeats],
    ...(report.userAgent ? ([["Navegador", report.userAgent]] as [string, string][]) : []),
    ...(report.digest ? ([["Digest", report.digest]] as [string, string][]) : []),
  ];

  const text = [
    `Ha fallado algo en ${siteConfig.name}.`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    report.stack ? `Traza:\n${report.stack}` : "(Sin traza.)",
    "",
    "—",
    "Si el mismo error se repite, no te llegará otro aviso hasta dentro de una hora;",
    "el siguiente te dirá cuántas veces ha pasado mientras tanto.",
    "Todos los errores quedan apuntados en la tabla app_errors de Supabase.",
  ].join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:640px">
  <h2 style="margin:0 0 12px;font-size:18px">⚠️ Ha fallado algo en ${escapeHtml(siteConfig.name)}</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:4px 0;word-break:break-word">${escapeHtml(value)}</td></tr>`,
      )
      .join("\n    ")}
  </table>
  ${
    report.stack
      ? `<pre style="margin:16px 0 0;padding:12px;background:#f5f5f5;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word">${escapeHtml(report.stack)}</pre>`
      : ""
  }
  <p style="margin:16px 0 0;font-size:12px;color:#888">Si el mismo error se repite, no te llegará otro aviso hasta dentro de una hora; el siguiente te dirá cuántas veces ha pasado mientras tanto. Todos quedan apuntados en la tabla <code>app_errors</code> de Supabase.</p>
</div>`;

  const shortMessage =
    report.message.length > 60 ? `${report.message.slice(0, 60)}…` : report.message;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.ERROR_ALERT_FROM || DEFAULT_FROM,
      to: process.env.ERROR_ALERT_EMAIL!.split(",").map((address) => address.trim()),
      subject: `⚠️ ${siteConfig.name}: ${shortMessage} (${where})`,
      text,
      html,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
  }
}
