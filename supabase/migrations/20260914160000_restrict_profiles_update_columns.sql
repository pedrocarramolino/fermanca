-- La política RLS de profiles ("owner_id = auth.uid()") solo limita QUÉ FILA
-- se puede actualizar, no QUÉ COLUMNAS — y is_admin tenía GRANT UPDATE sin
-- restringir para authenticated/anon (el permiso por defecto de Supabase al
-- crear la tabla), así que cualquier usuario autenticado podía auto-otorgarse
-- is_admin=true con una llamada REST directa a PostgREST (PATCH
-- /rest/v1/profiles?owner_id=eq.<su-propio-id> con {"is_admin": true}),
-- saltándose por completo las acciones de servidor de la app.
--
-- Arreglo: revocar el UPDATE general y conceder solo en las columnas que un
-- usuario debe poder cambiar de sí mismo (las mismas que tocan
-- updateUsername/updateAvatarUrl) — is_admin, invite_code, owner_id y
-- created_at quedan de solo lectura por REST directa; is_admin solo se
-- puede cambiar con la clave de servicio (como ya hace el seed inicial).
revoke update on public.profiles from authenticated, anon;
grant update (username, avatar_url) on public.profiles to authenticated;
