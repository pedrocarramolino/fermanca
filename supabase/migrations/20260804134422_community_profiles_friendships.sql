-- PracticeFlow — Comunidad: perfiles públicos y amistades.
-- profiles guarda solo lo necesario para que otros usuarios te encuentren
-- y te vean (username, código de invitación) — nunca el email ni nada
-- privado. Se crea sola al registrarse (trigger sobre auth.users), leyendo
-- el username que mandó el formulario de registro en user_metadata.

create table public.profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 20),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- Único case-insensitive: "Pedro" y "pedro" son el mismo usuario a efectos
-- de login y de no poder registrarse dos veces con variantes de mayúsculas.
create unique index profiles_username_lower_key on public.profiles (lower(username));

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  -- Normalizados para que exista como máximo una fila por par de usuarios
  -- sin importar quién pidió amistad a quién primero.
  low_id uuid generated always as (least(requester_id, addressee_id)) stored,
  high_id uuid generated always as (greatest(requester_id, addressee_id)) stored,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (low_id, high_id)
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;

-- profiles: tu propia fila siempre, y la de cualquiera con quien tengas
-- una fila en friendships (pendiente o aceptada) — pendiente también,
-- porque hay que poder mostrar quién te ha pedido amistad antes de
-- decidir si aceptar. El código de invitación de otros NO se expone por
-- aquí — buscarlo lo hace una acción de servidor con la clave de
-- servicio, para no poder recorrer/enumerar perfiles ajenos por RLS.
drop policy if exists "profiles_select_own_or_friend" on public.profiles;
create policy "profiles_select_own_or_friend" on public.profiles
for select to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = profiles.owner_id)
       or (f.addressee_id = auth.uid() and f.requester_id = profiles.owner_id)
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Sin política de insert/delete para usuarios normales: la fila la crea
-- solo el trigger (security definer) y se borra en cascada con la cuenta.

-- friendships: ves las solicitudes en las que participas, en cualquier
-- sentido. Solo puedes crear una como solicitante, y solo el destinatario
-- puede aceptarla (update de status). Cualquiera de los dos puede borrarla
-- (rechazar una pendiente, o dejar de ser amigos).
drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
for select to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "friendships_insert_as_requester" on public.friendships;
create policy "friendships_insert_as_requester" on public.friendships
for insert to authenticated
with check (requester_id = auth.uid());

drop policy if exists "friendships_update_as_addressee" on public.friendships;
create policy "friendships_update_as_addressee" on public.friendships
for update to authenticated
using (addressee_id = auth.uid())
with check (addressee_id = auth.uid());

drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
for delete to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Trigger: crea el perfil justo al registrarse. Código de invitación de 6
-- caracteres sin 0/O/1/I (se confunden fácil si se dictan de palabra).
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
begin
  loop
    code := (
      select string_agg(substr(chars, ceil(random() * length(chars))::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.profiles where invite_code = code);
  end loop;

  insert into public.profiles (owner_id, username, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'usuario_' || substr(new.id::text, 1, 8)),
    code
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

-- El trigger solo dispara en altas nuevas — a las cuentas que ya existían
-- antes de esta migración hay que crearles el perfil a mano, una vez.
-- lateral, no subconsulta suelta: sin correlación con la fila externa,
-- Postgres puede evaluar la subconsulta una sola vez para todo el INSERT
-- (la trata como InitPlan) y repetir el mismo código aleatorio en cada
-- fila — lateral fuerza una evaluación por fila.
insert into public.profiles (owner_id, username, invite_code)
select
  u.id,
  'usuario_' || substr(u.id::text, 1, 8),
  gen.code
from auth.users u
cross join lateral (
  select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', ceil(random() * 32)::int, 1), '') as code
  from generate_series(1, 6)
) gen
where not exists (select 1 from public.profiles p where p.owner_id = u.id);
