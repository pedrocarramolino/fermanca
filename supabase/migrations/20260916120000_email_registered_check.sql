-- Alta: comprobar si un correo ya tiene cuenta antes de intentar el
-- registro, igual que ya se hace con el nombre de usuario (ver
-- 20260804134422_community_profiles_friendships.sql). auth.users no está
-- expuesto por PostgREST (solo el esquema public), así que se expone como
-- una función security definer mínima: no filtra nada del usuario, solo si
-- el correo ya existe.
create or replace function public.email_registered(check_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

-- Solo el rol de servicio la llama, desde el server action de registro,
-- antes de intentar el alta — nunca directamente desde el cliente.
revoke all on function public.email_registered(text) from public;
grant execute on function public.email_registered(text) to service_role;
