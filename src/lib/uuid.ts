const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Antes de interpolar un id en un filtro PostgREST construido a mano (el
 * `.or()` de supabase-js no admite valores parametrizados, solo una cadena
 * con su propia sintaxis) — si no es un UUID válido, lanza en vez de
 * dejarlo colarse como sintaxis de filtro adicional.
 */
export function assertUuid(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error("Id con formato inválido.");
  }
}
