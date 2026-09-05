-- Compartir en el Feed que se ha cumplido el objetivo semanal — instantánea
-- aparte de session_shares porque un objetivo semanal no tiene session_id:
-- agrega práctica de varias sesiones, no viene de una sola. owner_username/
-- owner_avatar_url se copian igual que en session_shares (mismo motivo:
-- evitar un join con profiles que la RLS bloquearía para casi todo el
-- mundo). unique(owner_id, week_start) igual que unique(session_id) en
-- session_shares: solo se puede compartir una vez el objetivo de cada
-- semana natural.
create table public.weekly_goal_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_username text not null,
  owner_avatar_url text,
  week_start date not null,
  target_days integer not null check (target_days between 1 and 7),
  target_seconds integer not null check (target_seconds >= 0),
  practiced_days integer not null check (practiced_days >= 0),
  practiced_seconds integer not null check (practiced_seconds >= 0),
  streak_days integer not null check (streak_days >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, week_start)
);

create index weekly_goal_shares_owner_id_created_at_idx
  on public.weekly_goal_shares (owner_id, created_at desc);

alter table public.weekly_goal_shares enable row level security;

-- Mismo criterio que session_shares_select_own_or_friend: tu propia fila, o
-- la de un amigo aceptado.
drop policy if exists "weekly_goal_shares_select_own_or_friend" on public.weekly_goal_shares;
create policy "weekly_goal_shares_select_own_or_friend" on public.weekly_goal_shares
for select to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = weekly_goal_shares.owner_id)
        or (f.addressee_id = auth.uid() and f.requester_id = weekly_goal_shares.owner_id)
      )
  )
);

drop policy if exists "weekly_goal_shares_insert_own" on public.weekly_goal_shares;
create policy "weekly_goal_shares_insert_own" on public.weekly_goal_shares
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "weekly_goal_shares_delete_own" on public.weekly_goal_shares;
create policy "weekly_goal_shares_delete_own" on public.weekly_goal_shares
for delete to authenticated
using (owner_id = auth.uid());
