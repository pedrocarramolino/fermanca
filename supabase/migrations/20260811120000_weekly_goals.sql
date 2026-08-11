-- Objetivos semanales: días y horas de práctica que el usuario se marca al
-- principio de la semana (lunes). Una fila por usuario y semana; el
-- progreso NO se guarda aquí, se calcula en el dominio a partir de
-- `sessions`. "completed" es una marca manual del usuario al alcanzar el
-- objetivo, no se pone a true automáticamente.
create table public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  target_days smallint not null check (target_days between 1 and 7),
  target_seconds integer not null check (target_seconds > 0),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, week_start)
);

create index weekly_goals_owner_id_idx on public.weekly_goals (owner_id);

alter table public.weekly_goals enable row level security;

drop policy if exists "weekly_goals_all_own" on public.weekly_goals;
create policy "weekly_goals_all_own" on public.weekly_goals
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
