-- Grupos: dos modalidades elegidas por quien crea el grupo.
-- 'admin'   → estilo clase/profesor: el dueño puede fijar un objetivo
--             semanal para todo el grupo (él incluido).
-- 'creator' → estilo grupo de amigos: cualquier miembro puede invitar a
--             todo el grupo a una sesión (ver session_invites más abajo).
-- Ambas modalidades comparten el mismo "feed" de actividad (group_activity_events):
-- un muro de solo lectura (nada de chat) que se rellena solo cuando alguien
-- termina una sesión o completa el objetivo semanal del grupo — nunca a mano.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('admin', 'creator')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create index group_members_user_id_idx on public.group_members (user_id);

-- Objetivo semanal del grupo — solo lo fija el dueño de un grupo 'admin' (ver
-- política de insert/update más abajo). Una fila por grupo y semana, igual
-- que weekly_goals para el objetivo personal.
create table public.group_weekly_goals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  week_start date not null,
  target_days smallint not null check (target_days between 1 and 7),
  target_seconds integer not null check (target_seconds > 0),
  created_at timestamptz not null default now(),
  unique (group_id, week_start)
);

-- Cada miembro marca a mano cuándo ha alcanzado el objetivo del grupo esa
-- semana (igual que weekly_goals.completed es manual) — una fila por
-- miembro y objetivo, no un flag compartido.
create table public.group_weekly_goal_completions (
  id uuid primary key default gen_random_uuid(),
  group_weekly_goal_id uuid not null references public.group_weekly_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (group_weekly_goal_id, user_id)
);

-- Muro del grupo: solo estos dos tipos de evento, nunca texto libre (no es
-- un chat). `session_id` solo se rellena en 'session_finished'.
create table public.group_activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('session_finished', 'weekly_goal_completed')),
  session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index group_activity_events_group_id_created_at_idx
  on public.group_activity_events (group_id, created_at desc);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_weekly_goals enable row level security;
alter table public.group_weekly_goal_completions enable row level security;
alter table public.group_activity_events enable row level security;

-- groups: visible para el dueño (incluso antes de que exista su propia fila
-- en group_members, que se inserta justo después de crear el grupo) y para
-- cualquier miembro.
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
for select to authenticated
using (
  owner_id = auth.uid()
  or id in (select group_id from public.group_members where user_id = auth.uid())
);

drop policy if exists "groups_insert_as_owner" on public.groups;
create policy "groups_insert_as_owner" on public.groups
for insert to authenticated
with check (owner_id = auth.uid());

-- group_members: ves tu propia fila y la de cualquiera que comparta un
-- grupo contigo (subconsulta sobre la misma tabla — patrón estándar para
-- "es miembro del mismo grupo que yo", Postgres lo evalúa sin recursión).
-- Sin política de insert para el cliente autenticado a propósito: tanto
-- crear grupo (añadir al dueño) como unirse por código pasan siempre por
-- la clave de servicio (ver features/groups/application/actions.ts), igual
-- que sendFriendRequestByCode necesita la clave de servicio para buscar
-- por código sin poder recorrer perfiles ajenos.
drop policy if exists "group_members_select_shared_group" on public.group_members;
create policy "group_members_select_shared_group" on public.group_members
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.group_members gm2
    where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
  )
);

-- Salir del grupo (tú mismo) o expulsar a alguien (el dueño).
drop policy if exists "group_members_delete_self_or_owner" on public.group_members;
create policy "group_members_delete_self_or_owner" on public.group_members
for delete to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.groups g where g.id = group_members.group_id and g.owner_id = auth.uid()
  )
);

-- group_weekly_goals: cualquier miembro lo lee; solo el dueño de un grupo
-- 'admin' puede fijarlo o cambiarlo.
drop policy if exists "group_weekly_goals_select_member" on public.group_weekly_goals;
create policy "group_weekly_goals_select_member" on public.group_weekly_goals
for select to authenticated
using (
  group_id in (select group_id from public.group_members where user_id = auth.uid())
);

drop policy if exists "group_weekly_goals_write_admin_owner" on public.group_weekly_goals;
create policy "group_weekly_goals_write_admin_owner" on public.group_weekly_goals
for all to authenticated
using (
  exists (
    select 1 from public.groups g
    where g.id = group_weekly_goals.group_id and g.owner_id = auth.uid() and g.kind = 'admin'
  )
)
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_weekly_goals.group_id and g.owner_id = auth.uid() and g.kind = 'admin'
  )
);

-- group_weekly_goal_completions: cualquier miembro del grupo ve quién ha
-- completado el objetivo; cada uno solo puede marcar su propia fila.
drop policy if exists "group_weekly_goal_completions_select_member" on public.group_weekly_goal_completions;
create policy "group_weekly_goal_completions_select_member" on public.group_weekly_goal_completions
for select to authenticated
using (
  exists (
    select 1 from public.group_weekly_goals gwg
    join public.group_members gm on gm.group_id = gwg.group_id
    where gwg.id = group_weekly_goal_completions.group_weekly_goal_id and gm.user_id = auth.uid()
  )
);

drop policy if exists "group_weekly_goal_completions_insert_self" on public.group_weekly_goal_completions;
create policy "group_weekly_goal_completions_insert_self" on public.group_weekly_goal_completions
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.group_weekly_goals gwg
    join public.group_members gm on gm.group_id = gwg.group_id
    where gwg.id = group_weekly_goal_completions.group_weekly_goal_id and gm.user_id = auth.uid()
  )
);

-- group_activity_events: cualquier miembro del grupo lo lee. El insert lo
-- puede hacer cualquier miembro, pero solo como actor de sí mismo — nunca
-- en nombre de otro (ver finishSession y markGroupWeeklyGoalCompleted).
drop policy if exists "group_activity_events_select_member" on public.group_activity_events;
create policy "group_activity_events_select_member" on public.group_activity_events
for select to authenticated
using (
  group_id in (select group_id from public.group_members where user_id = auth.uid())
);

drop policy if exists "group_activity_events_insert_self" on public.group_activity_events;
create policy "group_activity_events_insert_self" on public.group_activity_events
for insert to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.group_members gm
    where gm.group_id = group_activity_events.group_id and gm.user_id = auth.uid()
  )
);

-- ── Extiende políticas ya existentes ────────────────────────────────────

-- profiles: además de tu propio perfil y el de tus amigos, ahora también el
-- de cualquiera con quien compartas un grupo (para poder mostrar su nombre
-- en la lista de miembros y en el feed de actividad).
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
  or exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = profiles.owner_id
  )
);

-- session_invites: además de a un amigo, también se puede invitar a
-- cualquiera con quien se comparta un grupo 'creator' (invitar a todo el
-- grupo, ver inviteGroupToSession) — los grupos 'admin' no dan este permiso.
drop policy if exists "session_invites_insert_inviter" on public.session_invites;
create policy "session_invites_insert_inviter" on public.session_invites
for insert to authenticated
with check (
  inviter_id = auth.uid()
  and (
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and f.low_id = least(auth.uid(), invitee_id)
        and f.high_id = greatest(auth.uid(), invitee_id)
    )
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      join public.groups g on g.id = gm1.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = invitee_id and g.kind = 'creator'
    )
  )
);
