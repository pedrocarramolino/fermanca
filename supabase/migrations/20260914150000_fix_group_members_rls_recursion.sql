-- La política de select de group_members se refería a sí misma (subconsulta
-- sobre group_members dentro de su propia política) — Postgres lo detecta
-- como recursión infinita en tiempo de planificación/ejecución (42P17) en
-- vez de resolverlo solo, y rompía por completo la pantalla de Comunidad.
--
-- Arreglo estándar de Supabase para este caso: una función SECURITY DEFINER
-- que consulta group_members directamente (sin pasar por su propia RLS,
-- porque se ejecuta con los privilegios del dueño de la función) — la
-- política llama a esta función en vez de hacer la subconsulta ella misma,
-- así la evaluación no vuelve a disparar la política de group_members.
--
-- Vive en el esquema `private` (no expuesto por PostgREST) en vez de
-- `public` a propósito: una función así en `public` queda expuesta como
-- RPC (`/rest/v1/rpc/is_group_member`) callable por cualquiera —anon
-- incluido— con cualquier par group_id/user_id, filtrando pertenencias a
-- grupos ajenas. `authenticated` necesita EXECUTE igualmente para que la
-- política de RLS (que se evalúa como ese rol) pueda llamarla, pero eso no
-- pasa por la API REST, así que no queda expuesta por ahí.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

grant execute on function private.is_group_member(uuid, uuid) to authenticated;

drop policy if exists "group_members_select_shared_group" on public.group_members;
create policy "group_members_select_shared_group" on public.group_members
for select to authenticated
using (
  user_id = auth.uid()
  or private.is_group_member(group_members.group_id, auth.uid())
);
