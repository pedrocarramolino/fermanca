-- Sesiones cooperativas: dos usuarios hacen la MISMA sesión a la vez, cada
-- uno con su propia fila `sessions` (para que estadísticas/rachas/objetivos
-- semanales sigan funcionando sin ningún cambio), enlazadas entre sí.
-- Cualquier mutación del cronómetro en una se replica en la otra desde el
-- servidor (cliente de servicio, ver coop-mirror.ts) — nunca se concede
-- acceso RLS a la fila ajena, ni falta que hace.

alter table public.sessions add column linked_session_id uuid references public.sessions(id) on delete set null;
alter table public.sessions add column linked_session_peer_username text;
create index sessions_linked_session_id_idx on public.sessions (linked_session_id);

-- ── session_invites ─────────────────────────────────────────────────────
-- El estado vive aquí desde ANTES de que exista ninguna sesión: `blocks`
-- guarda el borrador tal cual (mismo shape que DraftBlockInput) para poder
-- crear las dos sesiones gemelas, con posiciones idénticas, en el momento
-- de aceptar.
create table public.session_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  blocks jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  inviter_session_id uuid references public.sessions(id) on delete set null,
  invitee_session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint session_invites_no_self check (inviter_id <> invitee_id)
);
create index session_invites_invitee_pending_idx on public.session_invites (invitee_id) where status = 'pending';

alter table public.session_invites enable row level security;

drop policy if exists "session_invites_select_participant" on public.session_invites;
create policy "session_invites_select_participant" on public.session_invites
for select to authenticated
using (inviter_id = auth.uid() or invitee_id = auth.uid());

-- Solo se puede invitar a un amigo con amistad ya aceptada — misma
-- comprobación que hace sendFriendRequestByCode en la app, aquí reforzada
-- también a nivel de base de datos.
drop policy if exists "session_invites_insert_inviter" on public.session_invites;
create policy "session_invites_insert_inviter" on public.session_invites
for insert to authenticated
with check (
  inviter_id = auth.uid()
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and f.low_id = least(auth.uid(), invitee_id)
      and f.high_id = greatest(auth.uid(), invitee_id)
  )
);

-- Dos políticas de update separadas, igual que friendships separa
-- insert/accept: el invitado acepta o rechaza, el que invita cancela.
drop policy if exists "session_invites_update_invitee" on public.session_invites;
create policy "session_invites_update_invitee" on public.session_invites
for update to authenticated
using (invitee_id = auth.uid())
with check (invitee_id = auth.uid());

drop policy if exists "session_invites_update_inviter" on public.session_invites;
create policy "session_invites_update_inviter" on public.session_invites
for update to authenticated
using (inviter_id = auth.uid())
with check (inviter_id = auth.uid());

-- ── session_events ──────────────────────────────────────────────────────
-- Feed efímero de "quién hizo qué" para el aviso en vivo en el dispositivo
-- del compañero — no es un historial persistente en la UI, solo lo que la
-- suscripción de Realtime necesita para mostrar un aviso puntual.
create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_username text not null,
  type text not null check (type in (
    'paused', 'resumed', 'phase_confirmed', 'time_extended',
    'phase_added', 'phases_reordered', 'session_finished'
  )),
  created_at timestamptz not null default now()
);
create index session_events_session_id_created_at_idx on public.session_events (session_id, created_at desc);

alter table public.session_events enable row level security;

drop policy if exists "session_events_select_own_session" on public.session_events;
create policy "session_events_select_own_session" on public.session_events
for select to authenticated
using (exists (select 1 from public.sessions s where s.id = session_events.session_id and s.owner_id = auth.uid()));

-- El insert en la fila del COMPAÑERO (session_id de una sesión que no es la
-- tuya) siempre pasa por el cliente de servicio (ver coop-mirror.ts), que
-- salta RLS por completo — esta política solo cubre insertar en el feed de
-- tu propia sesión.
drop policy if exists "session_events_insert_own_session" on public.session_events;
create policy "session_events_insert_own_session" on public.session_events
for insert to authenticated
with check (
  actor_id = auth.uid()
  and exists (select 1 from public.sessions s where s.id = session_events.session_id and s.owner_id = auth.uid())
);

-- ── Realtime ─────────────────────────────────────────────────────────────
-- Ninguna tabla estaba publicada hasta ahora — se activa solo para las
-- cuatro a las que el cliente se suscribe. Realtime respeta la RLS de cada
-- tabla automáticamente, así que no hace falta ninguna política aparte.
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_blocks;
alter publication supabase_realtime add table public.session_invites;
alter publication supabase_realtime add table public.session_events;
