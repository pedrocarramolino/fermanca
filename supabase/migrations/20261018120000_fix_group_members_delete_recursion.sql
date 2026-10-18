-- Quitar a alguien de un grupo (o salirse) fallaba siempre con 42P17
-- "infinite recursion detected in policy for relation group_members" (visto
-- el 18/10/2026): la política de delete de group_members consultaba
-- `groups` para saber si quien borra es el dueño, y la política de select
-- de `groups` vuelve a consultar group_members — Postgres ve group_members
-- dentro de la expansión de sus propias políticas y lo corta.
--
-- Mismo arreglo que 20260914150000_fix_group_members_rls_recursion.sql: una
-- función SECURITY DEFINER en `private` (no expuesta por PostgREST) que
-- mira `groups` sin pasar por su RLS.
create function private.is_group_owner(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and owner_id = p_user_id
  );
$$;

revoke all on function private.is_group_owner(uuid, uuid) from public;
grant execute on function private.is_group_owner(uuid, uuid) to authenticated;

drop policy if exists "group_members_delete_self_or_owner" on public.group_members;
create policy "group_members_delete_self_or_owner" on public.group_members
for delete to authenticated
using (
  user_id = (select auth.uid())
  or private.is_group_owner(group_members.group_id, (select auth.uid()))
);
