alter table public.categories
  add column if not exists is_ghost boolean not null default false;
