-- Eventos de calendario: fechas sueltas que el usuario se marca (concierto,
-- examen, entrega…) para ver una cuenta atrás en la pantalla de Avisos —
-- a diferencia de `reminders` (hora + días de la semana recurrentes), esto
-- es una fecha concreta, sin repetición ni aviso programado por QStash.
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  event_date date not null,
  created_at timestamptz not null default now()
);

create index calendar_events_owner_id_idx on public.calendar_events (owner_id);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_all_own" on public.calendar_events;
create policy "calendar_events_all_own" on public.calendar_events
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
