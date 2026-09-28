import { unstable_isUnrecognizedActionError } from "next/navigation";

/**
 * Pestañas que siguen abiertas tras un despliegue.
 *
 * Cada despliegue genera ids nuevos para las acciones del servidor. Una
 * pestaña cargada antes —típicamente el móvil con la app en segundo plano
 * desde hace horas, a mitad de una sesión— sigue llamando a los ids viejos,
 * y el servidor nuevo responde que no existen (UnrecognizedActionError): lo
 * que se estaba guardando se pierde. El service worker no lo evita, porque
 * sw.js no cambia de un despliegue a otro y nunca dispara su recarga.
 *
 * Dos defensas:
 *  · al volver la app a primer plano se pregunta al servidor qué versión
 *    sirve (/api/version) y, si ya no es la de esta pestaña, se recarga
 *    ANTES de que la persona toque nada;
 *  · si aun así una acción falla por esto, se recarga en vez de dejar la
 *    pantalla a medias (ver isStaleVersionError en los catch).
 */

/** Id de esta compilación — lo fija next.config.ts, el mismo valor que
 * devuelve /api/version de esta misma compilación. Vacío en local. */
const CLIENT_BUILD = process.env.NEXT_PUBLIC_BUILD_TOKEN ?? "";

const RELOAD_AT_KEY = "fermanca:version-reload-at";
/** Si tras recargar sigue sin cuadrar (p. ej. el CDN aún sirve la versión
 * anterior), no se vuelve a recargar hasta pasado este rato: nunca un bucle. */
const MIN_RELOAD_INTERVAL_MS = 60_000;

export function isStaleVersionError(error: unknown): boolean {
  if (unstable_isUnrecognizedActionError(error)) return true;
  return (
    error instanceof Error &&
    (error.name === "UnrecognizedActionError" ||
      /Server Action ".*" was not found on the server/.test(error.message))
  );
}

/** Recarga la página para coger la versión nueva. Devuelve false (y no
 * recarga) si ya lo hizo hace nada, o si no puede recordarlo. */
export function reloadToNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) ?? 0);
    if (Date.now() - last < MIN_RELOAD_INTERVAL_MS) return false;
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Para los catch de las acciones: true si ya se está recargando (y por
 * tanto no hace falta enseñar ningún error). */
export function reloadIfStaleVersion(error: unknown): boolean {
  return isStaleVersionError(error) && reloadToNewVersion();
}

export async function checkForNewVersion(): Promise<void> {
  if (!CLIENT_BUILD || !navigator.onLine) return;
  try {
    // POST a propósito: el service worker guarda en caché las respuestas GET
    // de /api/ para usarlas sin conexión, y una versión vieja guardada haría
    // creer que hay otra nueva.
    const response = await fetch("/api/version", { method: "POST", cache: "no-store" });
    if (!response.ok) return;
    const { build } = (await response.json()) as { build?: string };
    if (build && build !== CLIENT_BUILD) reloadToNewVersion();
  } catch {
    // Sin conexión o el servidor no responde: ya se comprobará la próxima vez.
  }
}
