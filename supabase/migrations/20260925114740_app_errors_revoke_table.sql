-- Con RLS activado y sin políticas, anon/authenticated ya no veían ninguna
-- fila de app_errors; esto quita además los permisos de tabla que Supabase
-- concede por defecto, para que ni siquiera un fallo futuro de RLS (una
-- política añadida por error) pudiera exponer trazas de errores ni ids de
-- usuario. Solo la clave secreta la toca.
revoke all on table public.app_errors from anon, authenticated;
