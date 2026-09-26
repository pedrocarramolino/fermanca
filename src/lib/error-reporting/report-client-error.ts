import type {
  ClientErrorKind,
  ClientErrorPayload,
} from "@/lib/error-reporting/client-error-payload";

/** Tope por página: si algo entra en bucle, no se bombardea el servidor. */
const MAX_REPORTS_PER_PAGE = 5;
const MAX_STACK_CHARS = 8_000;

/**
 * Ruido que no es un fallo de la app y que, si se avisara, enterraría los
 * avisos de verdad:
 *  · el móvil sin cobertura o que cancela una petición al cambiar de app;
 *  · tras cada despliegue, pestañas abiertas que piden trozos de JS que ya
 *    no existen (el service worker recarga solo y se arregla);
 *  · extensiones del navegador y el aviso inofensivo de ResizeObserver;
 *  · "Script error.", que es un error de otro dominio sin ningún dato útil.
 */
const NOISE_PATTERNS = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Loading chunk [\w-]+ failed/i,
  /ChunkLoadError/,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to fetch/i,
  /NetworkError when attempting to fetch/i,
  /^Load failed$/i,
  /network connection was lost/i,
  /Internet connection appears to be offline/i,
  /AbortError/,
  /The operation was aborted/i,
  /signal is aborted/i,
];
const EXTENSION_STACK = /(chrome|moz|safari(-web)?)-extension:\/\//;

let reportsSent = 0;
const alreadyReported = new Set<string>();

function toError(value: unknown): Error & { digest?: string } {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

/**
 * Manda a /api/errors un error que le ha pasado a alguien en el navegador,
 * que a su vez te llega por correo. Nunca lanza ni espera: el aviso sale en
 * segundo plano y, si no puede, se pierde sin molestar a la persona.
 */
export function reportClientError(value: unknown, kind: ClientErrorKind): void {
  if (process.env.NODE_ENV !== "production" || typeof window === "undefined") return;

  const error = toError(value);
  // Con `digest` es un error del servidor que Next ha reenviado al
  // navegador: instrumentation.ts ya lo avisó desde allí, con más detalle.
  if (error.digest) return;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(`${error.name}: ${error.message}`))) return;
  if (error.stack && EXTENSION_STACK.test(error.stack)) return;

  const key = `${error.name}|${error.message}`;
  if (alreadyReported.has(key) || reportsSent >= MAX_REPORTS_PER_PAGE) return;
  alreadyReported.add(key);
  reportsSent += 1;

  const payload: ClientErrorPayload = {
    kind,
    name: error.name,
    message: error.message,
    stack: error.stack ? error.stack.slice(0, MAX_STACK_CHARS) : null,
    path: window.location.pathname,
  };

  // keepalive: que el aviso salga aunque la página se esté cerrando o
  // recargando justo después del fallo.
  fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
