-- Reacciones con emoji a una publicación del Feed. Cada persona puede
-- reaccionar con más de un emoji a la misma publicación (como en Slack),
-- pero no repetir el mismo emoji dos veces — de ahí el índice único. El
-- conjunto de emojis permitidos es fijo (el mismo que ofrece el selector en
-- la UI), con un check aparte por si algún día cambia sin tocar el esquema.
--
-- select/insert repiten el mismo criterio de visibilidad que
-- session_shares_select_own_or_friend (dueño de la publicación o amigo
-- aceptado suyo) — RLS no permite reutilizar la policy de otra tabla, así
-- que toca copiarlo. delete solo exige que la reacción sea tuya: quitar tu
-- propia reacción no necesita comprobar que sigues viendo la publicación.
create table public.session_share_reactions (
  id uuid primary key default gen_random_uuid(),
  session_share_id uuid not null references public.session_shares (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '🔥', '👏', '❤️', '💪')),
  created_at timestamptz not null default now(),
  unique (session_share_id, owner_id, emoji)
);

create index session_share_reactions_share_id_idx
  on public.session_share_reactions (session_share_id);

alter table public.session_share_reactions enable row level security;

drop policy if exists "session_share_reactions_select_visible" on public.session_share_reactions;
create policy "session_share_reactions_select_visible" on public.session_share_reactions
for select to authenticated
using (
  exists (
    select 1 from public.session_shares s
    where s.id = session_share_reactions.session_share_id
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

drop policy if exists "session_share_reactions_insert_own" on public.session_share_reactions;
create policy "session_share_reactions_insert_own" on public.session_share_reactions
for insert to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.session_shares s
    where s.id = session_share_reactions.session_share_id
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

drop policy if exists "session_share_reactions_delete_own" on public.session_share_reactions;
create policy "session_share_reactions_delete_own" on public.session_share_reactions
for delete to authenticated
using (owner_id = auth.uid());
