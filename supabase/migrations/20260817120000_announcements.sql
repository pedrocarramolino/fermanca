-- Tablón de anuncios en Comunidad: visible para cualquier usuario logueado,
-- pero solo los administradores (profiles.is_admin) pueden publicar o
-- borrar. El nombre de quien publica se guarda tal cual en la fila
-- (author_username) en vez de resolverse por join con profiles al leer: la
-- política de select de profiles solo deja ver tu propia fila o la de un
-- amigo, y un anuncio lo puede ver cualquiera, así que un join fallaría RLS
-- para casi todo el mundo.

alter table public.profiles add column is_admin boolean not null default false;

update public.profiles set is_admin = true where username in ('pedraco17', '_alejandromas');

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_username text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index announcements_created_at_idx on public.announcements (created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_all" on public.announcements;
create policy "announcements_select_all" on public.announcements
for select to authenticated
using (true);

drop policy if exists "announcements_insert_admin" on public.announcements;
create policy "announcements_insert_admin" on public.announcements
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (select 1 from public.profiles p where p.owner_id = auth.uid() and p.is_admin)
);

drop policy if exists "announcements_delete_admin" on public.announcements;
create policy "announcements_delete_admin" on public.announcements
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.owner_id = auth.uid() and p.is_admin)
);
