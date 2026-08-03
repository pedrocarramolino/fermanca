-- PracticeFlow — Row Level Security.
-- Regla general: un usuario solo puede leer/escribir sus propias filas
-- (owner_id = auth.uid()). Las tablas hijas sin owner_id propio (los
-- *_blocks) heredan el permiso comprobando el propietario del padre.
-- Las categorías 'system' son de solo lectura para cualquier usuario
-- autenticado; solo se gestionan por migración/seed, nunca desde la app.

alter table public.categories enable row level security;
alter table public.templates enable row level security;
alter table public.template_blocks enable row level security;
alter table public.sessions enable row level security;
alter table public.session_blocks enable row level security;
alter table public.reminders enable row level security;
alter table public.user_settings enable row level security;

-- Cada política se recrea (drop + create) para que este archivo se pueda
-- volver a ejecutar sin errores si una ejecución anterior quedó a medias.

-- categories
drop policy if exists "categories_select_system_or_own" on public.categories;
create policy "categories_select_system_or_own" on public.categories
for select to authenticated
using (kind = 'system' or owner_id = auth.uid());

drop policy if exists "categories_insert_own_custom" on public.categories;
create policy "categories_insert_own_custom" on public.categories
for insert to authenticated
with check (kind = 'custom' and owner_id = auth.uid());

drop policy if exists "categories_update_own_custom" on public.categories;
create policy "categories_update_own_custom" on public.categories
for update to authenticated
using (kind = 'custom' and owner_id = auth.uid())
with check (kind = 'custom' and owner_id = auth.uid());

drop policy if exists "categories_delete_own_custom" on public.categories;
create policy "categories_delete_own_custom" on public.categories
for delete to authenticated
using (kind = 'custom' and owner_id = auth.uid());

-- templates
drop policy if exists "templates_all_own" on public.templates;
create policy "templates_all_own" on public.templates
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- template_blocks (hereda el propietario de templates)
drop policy if exists "template_blocks_all_own" on public.template_blocks;
create policy "template_blocks_all_own" on public.template_blocks
for all to authenticated
using (exists (
  select 1 from public.templates t
  where t.id = template_blocks.template_id and t.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.templates t
  where t.id = template_blocks.template_id and t.owner_id = auth.uid()
));

-- sessions
drop policy if exists "sessions_all_own" on public.sessions;
create policy "sessions_all_own" on public.sessions
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- session_blocks (hereda el propietario de sessions)
drop policy if exists "session_blocks_all_own" on public.session_blocks;
create policy "session_blocks_all_own" on public.session_blocks
for all to authenticated
using (exists (
  select 1 from public.sessions s
  where s.id = session_blocks.session_id and s.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.sessions s
  where s.id = session_blocks.session_id and s.owner_id = auth.uid()
));

-- reminders
drop policy if exists "reminders_all_own" on public.reminders;
create policy "reminders_all_own" on public.reminders
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- user_settings
drop policy if exists "user_settings_all_own" on public.user_settings;
create policy "user_settings_all_own" on public.user_settings
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
