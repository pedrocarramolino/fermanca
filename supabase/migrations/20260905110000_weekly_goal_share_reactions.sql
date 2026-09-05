-- Reacciones a una publicación de "objetivo semanal cumplido" — mismo
-- esquema y mismas políticas que session_share_reactions (ver esa
-- migración), pero apuntando a weekly_goal_shares en vez de session_shares:
-- son tablas de publicación independientes, así que hace falta una tabla de
-- reacciones aparte para cada una en vez de una columna polimórfica.
create table public.weekly_goal_share_reactions (
  id uuid primary key default gen_random_uuid(),
  weekly_goal_share_id uuid not null references public.weekly_goal_shares (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '🔥', '👏', '❤️', '💪')),
  created_at timestamptz not null default now(),
  unique (weekly_goal_share_id, owner_id, emoji)
);

create index weekly_goal_share_reactions_share_id_idx
  on public.weekly_goal_share_reactions (weekly_goal_share_id);

alter table public.weekly_goal_share_reactions enable row level security;

drop policy if exists "weekly_goal_share_reactions_select_visible" on public.weekly_goal_share_reactions;
create policy "weekly_goal_share_reactions_select_visible" on public.weekly_goal_share_reactions
for select to authenticated
using (
  exists (
    select 1 from public.weekly_goal_shares s
    where s.id = weekly_goal_share_reactions.weekly_goal_share_id
      and (
        s.owner_id = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and (
              (f.requester_id = auth.uid() and f.addressee_id = s.owner_id)
              or (f.addressee_id = auth.uid() and f.requester_id = s.owner_id)
            )
        )
      )
  )
);

drop policy if exists "weekly_goal_share_reactions_insert_own" on public.weekly_goal_share_reactions;
create policy "weekly_goal_share_reactions_insert_own" on public.weekly_goal_share_reactions
for insert to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.weekly_goal_shares s
    where s.id = weekly_goal_share_reactions.weekly_goal_share_id
      and (
        s.owner_id = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and (
              (f.requester_id = auth.uid() and f.addressee_id = s.owner_id)
              or (f.addressee_id = auth.uid() and f.requester_id = s.owner_id)
            )
        )
      )
  )
);

drop policy if exists "weekly_goal_share_reactions_delete_own" on public.weekly_goal_share_reactions;
create policy "weekly_goal_share_reactions_delete_own" on public.weekly_goal_share_reactions
for delete to authenticated
using (owner_id = auth.uid());
