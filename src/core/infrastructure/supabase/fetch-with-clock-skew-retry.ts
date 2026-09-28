/**
 * `fetch` para los clientes de Supabase que reintenta, una sola vez, la
 * petición que PostgREST rechaza con "JWT issued at future" (PGRST303).
 *
 * Pasa justo después de renovar la sesión: el servidor de Auth firma el
 * token nuevo con su reloj y, si el de la base de datos va un segundo por
 * detrás, la primera consulta con ese token lo ve "emitido en el futuro".
 * Visto en producción (28/9/2026): la renovación a las 18:56:10.4, la
 * consulta rechazada a las 18:56:11.0 y la misma consulta aceptada a las
 * 18:56:12.9 — a esa persona le salió la pantalla de error sin motivo.
 *
 * Solo se reintenta ese caso concreto (PGRST303 también cubre "JWT
 * expired", que esperar no arregla). El cuerpo de las peticiones de
 * supabase-js es un string, así que se puede volver a mandar tal cual.
 */

const RETRY_DELAY_MS = 1_500;

export const fetchWithClockSkewRetry: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;

  let body: string;
  try {
    body = await response.clone().text();
  } catch {
    return response;
  }
  if (!/issued at future/i.test(body)) return response;

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return fetch(input, init);
};
