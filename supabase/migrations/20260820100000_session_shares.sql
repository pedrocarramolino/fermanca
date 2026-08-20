-- Feed: sesiones que un usuario decide compartir con sus amigos, visibles
-- en un apartado propio en Inicio (sustituye ahí a "Últimas sesiones", que
-- pasa a Estadísticas).
--
-- No es una vista en vivo sobre `sessions`/`session_blocks`: es una
-- instantánea guardada en el momento de compartir, con exactamente los
-- mismos campos que ya expone getPublicSummary (nunca final_note ni las
-- notas de bloque) — así, aunque la sesión original se edite o se borre
-- después, lo ya compartido no cambia ni desaparece. `blocks` va en jsonb
-- en vez de en su propia tabla, mismo patrón que `session_invites.blocks`.
--
-- owner_username/owner_avatar_url se copian tal cual al compartir en vez de
-- resolverse por join con profiles al leer — mismo motivo que
-- announcements.author_username: aquí sí podría pasar la RLS de profiles
-- (el lector siempre es amigo del autor), pero copiarlo evita el join y dos
-- consultas por lectura, al coste ya aceptado en otros sitios (p. ej.
-- sessions.linked_session_peer_username) de que un cambio de username
-- posterior no se refleje en lo ya compartido.
create table public.session_shares (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_username text not null,
  owner_avatar_url text,
  started_at timestamptz not null,
  total_duration_seconds integer not null check (total_duration_seconds >= 0),
  blocks jsonb not null,
  created_at timestamptz not null default now(),
  -- Una sesión solo puede estar compartida una vez — "compartir" con la
  -- misma sesión dos veces no debe duplicar la entrada en el feed.
  unique (session_id)
);

create index session_shares_owner_id_created_at_idx on public.session_shares (owner_id, created_at desc);

alter table public.session_shares enable row level security;

-- select: tu propia fila, o la de cualquier amigo aceptado — mismo shape
-- que profiles_select_own_or_friend, pero exige 'accepted' (a diferencia de
-- profiles, aquí no hace falta ver el feed de una solicitud aún pendiente).
drop policy if exists "session_shares_select_own_or_friend" on public.session_shares;
create policy "session_shares_select_own_or_friend" on public.session_shares
for select to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = session_shares.owner_id)
        or (f.addressee_id = auth.uid() and f.requester_id = session_shares.owner_id)
      )
  )
);

drop policy if exists "session_shares_insert_own" on public.session_shares;
create policy "session_shares_insert_own" on public.session_shares
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "session_shares_delete_own" on public.session_shares;
create policy "session_shares_delete_own" on public.session_shares
for delete to authenticated
using (owner_id = auth.uid());
