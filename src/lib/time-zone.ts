/**
 * Zona horaria con la que se pintan las horas (p. ej. "28 sept, 20:56").
 *
 * Tiene que ser LA MISMA en el servidor y en el navegador: el servidor de
 * Vercel trabaja en UTC y el móvil en la hora local, así que si cada uno
 * usara la suya, React veía "18:56" en el HTML y "20:56" al hidratar, daba
 * el error #418 y repintaba la página entera. Por eso la resuelve el
 * servidor (i18n/request.ts) y next-intl se la pasa tal cual al navegador
 * (useTimeZone / getTimeZone).
 *
 * El navegador guarda su zona real en la cookie TIME_ZONE_COOKIE (ver el
 * script del layout raíz), así que a partir de la segunda carga es la del
 * propio móvil. Hasta entonces, la hora de España.
 */
export const TIME_ZONE_COOKIE = "tz";
export const DEFAULT_TIME_ZONE = "Europe/Madrid";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Valor de la cookie → zona válida, o la de por defecto. */
export function resolveTimeZone(cookieValue: string | undefined): string {
  if (!cookieValue) return DEFAULT_TIME_ZONE;
  let timeZone = cookieValue;
  try {
    timeZone = decodeURIComponent(cookieValue);
  } catch {
    // Ya venía decodificada, o mal formada: se valida tal cual abajo.
  }
  return isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
}

/**
 * Script que va en el <head> (HTML estático, no se hidrata): guarda la zona
 * horaria real del navegador para que el servidor la use en la próxima
 * petición. Solo reescribe la cookie si ha cambiado (p. ej. de viaje).
 */
export const TIME_ZONE_COOKIE_SCRIPT = `(function(){try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(!z)return;var v=encodeURIComponent(z);if(document.cookie.split("; ").indexOf("${TIME_ZONE_COOKIE}="+v)<0){document.cookie="${TIME_ZONE_COOKIE}="+v+";path=/;max-age=31536000;samesite=lax"}}catch(e){}})();`;
