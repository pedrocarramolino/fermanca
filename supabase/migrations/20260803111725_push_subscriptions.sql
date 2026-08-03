-- PracticeFlow — suscripciones Web Push (una fila por navegador/dispositivo
-- suscrito). El endpoint de cron que envía los recordatorios lee esta tabla
-- con la clave secreta (bypassa RLS) porque necesita ver las de todos los
-- usuarios, no solo las de uno.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_owner_id_idx on public.push_subscriptions (owner_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_all_own" on public.push_subscriptions;
create policy "push_subscriptions_all_own" on public.push_subscriptions
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
