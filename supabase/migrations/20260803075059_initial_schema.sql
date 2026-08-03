-- PracticeFlow — esquema inicial.
-- Convenciones: tablas en snake_case, uuid como PK, owner_id referencia a
-- auth.users para todo lo propiedad de un usuario, timestamptz en UTC.
create extension if not exists pgcrypto;

-- ── enums ─────────────────────────────────────────────────────────────────

create type public.category_kind as enum ('system', 'custom');
create type public.session_status as enum ('in_progress', 'completed', 'abandoned');
create type public.session_block_status as enum ('pending', 'active', 'completed', 'skipped');
create type public.theme_preference as enum ('light', 'dark', 'system');
create type public.sound_choice as enum ('classic', 'bell', 'metronome', 'piano', 'none');

-- ── categories ────────────────────────────────────────────────────────────
-- Las 4 categorías fijas (Calentamiento, Flexibilidad, Técnica, Obras) son
-- filas 'system' (owner_id null, slug obligatorio), compartidas por todos
-- los usuarios. Las categorías personalizadas son 'custom', propiedad de un
-- usuario, sin slug. El color es decorativo (puntos, barras, gráficos), no
-- se usa como color de texto, así que no necesita pareja de contraste.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  kind public.category_kind not null,
  slug text,
  name text not null check (char_length(name) between 1 and 60),
  color text not null,
  created_at timestamptz not null default now(),
  constraint categories_shape_by_kind check (
    (kind = 'system' and owner_id is null and slug is not null)
    or
    (kind = 'custom' and owner_id is not null and slug is null)
  )
);

create unique index categories_system_slug_key on public.categories (slug) where kind = 'system';
create index categories_owner_id_idx on public.categories (owner_id);

-- ── templates ─────────────────────────────────────────────────────────────
-- Planificaciones guardadas por el usuario (p. ej. "Estudio diario").

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index templates_owner_id_idx on public.templates (owner_id);

create table public.template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  duration_seconds integer not null check (duration_seconds > 0),
  color text not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (template_id, position)
);

create index template_blocks_template_id_idx on public.template_blocks (template_id);

-- ── sessions ──────────────────────────────────────────────────────────────
-- Una sesión es la ejecución real de una práctica (a partir de una
-- plantilla o improvisada). session_blocks es la instancia ejecutada de
-- cada bloque, con su duración real y nota rápida — independiente de
-- template_blocks para que el historial no cambie si el usuario edita la
-- plantilla después.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references public.templates (id) on delete set null,
  status public.session_status not null default 'in_progress',
  planned_duration_seconds integer not null check (planned_duration_seconds >= 0),
  actual_duration_seconds integer not null default 0 check (actual_duration_seconds >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  final_note text check (char_length(final_note) <= 2000),
  created_at timestamptz not null default now(),
  constraint sessions_ended_after_started check (ended_at is null or ended_at >= started_at)
);

create index sessions_owner_id_started_at_idx on public.sessions (owner_id, started_at desc);
create index sessions_template_id_idx on public.sessions (template_id);

create table public.session_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  color text not null,
  position integer not null check (position >= 0),
  planned_duration_seconds integer not null check (planned_duration_seconds > 0),
  actual_duration_seconds integer not null default 0 check (actual_duration_seconds >= 0),
  status public.session_block_status not null default 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  note text check (char_length(note) <= 2000),
  unique (session_id, position)
);

create index session_blocks_session_id_idx on public.session_blocks (session_id);
create index session_blocks_category_id_idx on public.session_blocks (category_id);

-- ── reminders ─────────────────────────────────────────────────────────────

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  time_of_day time not null,
  -- 0 = domingo … 6 = sábado (convención ISO-ish adaptada, ver dominio TS)
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index reminders_owner_id_idx on public.reminders (owner_id);

-- ── user_settings ─────────────────────────────────────────────────────────
-- Fila 1:1 con el usuario. Se crea perezosamente (upsert) la primera vez
-- que el usuario guarda una preferencia; no hay trigger de creación
-- automática en el signup para mantener el esquema de auth desacoplado.

create table public.user_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  theme public.theme_preference not null default 'system',
  sound public.sound_choice not null default 'classic',
  volume smallint not null default 80 check (volume between 0 and 100),
  vibration_enabled boolean not null default true,
  visual_alert_duration_ms integer not null default 3000 check (visual_alert_duration_ms > 0),
  accent_color text,
  updated_at timestamptz not null default now()
);
