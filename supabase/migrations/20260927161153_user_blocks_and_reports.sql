-- Bloquear y denunciar a otros usuarios (lo exige Google Play a cualquier app
-- en la que la gente se vea entre sí).
--
-- BLOQUEOS
-- `user_blocks` guarda quién ha bloqueado a quién. Solo quien bloquea ve sus
-- filas: la persona bloqueada no tiene forma de saberlo (ni por la API).
--
-- Qué hace un bloqueo (en los dos sentidos):
--   · la acción de bloquear borra la amistad o solicitud que hubiera, y con
--     ella desaparece todo lo que depende de ser amigos (Feed, reacciones,
--     progreso, invitaciones directas a sesión, perfil);
--   · ninguno de los dos puede volver a pedirle amistad al otro (política de
--     friendships de abajo) ni invitarle a una sesión desde un grupo
--     (política de session_invites);
--   · la app tampoco os sugiere mutuamente ni enseña la actividad del otro en
--     los grupos que compartáis (eso se filtra en el código).
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Para la comprobación "¿me ha bloqueado alguien?" (el otro sentido del PK).
create index if not exists user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy user_blocks_select_own on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy user_blocks_insert_own on public.user_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy user_blocks_delete_own on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.user_blocks from anon;

-- ¿Hay un bloqueo entre estas dos personas, en cualquier sentido? SECURITY
-- DEFINER porque tiene que ver también los bloqueos que ha hecho LA OTRA
-- persona (que RLS esconde); en `private`, que PostgREST no expone, para que
-- nadie pueda usarla para averiguar quién le ha bloqueado.
create or replace function private.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

revoke all on function private.is_blocked_between(uuid, uuid) from public;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;

drop policy if exists friendships_insert_as_requester on public.friendships;
create policy friendships_insert_as_requester on public.friendships
  for insert
  with check (
    requester_id = (select auth.uid())
    and not private.is_blocked_between(requester_id, addressee_id)
  );

drop policy if exists session_invites_insert_inviter on public.session_invites;
create policy session_invites_insert_inviter on public.session_invites
  for insert
  with check (
    inviter_id = (select auth.uid())
    and not private.is_blocked_between(inviter_id, invitee_id)
    and (
      exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and f.low_id = least((select auth.uid()), session_invites.invitee_id)
          and f.high_id = greatest((select auth.uid()), session_invites.invitee_id)
      )
      or exists (
        select 1
        from public.group_members gm1
        join public.group_members gm2 on gm1.group_id = gm2.group_id
        join public.groups g on g.id = gm1.group_id
        where gm1.user_id = (select auth.uid())
          and gm2.user_id = session_invites.invitee_id
          and g.kind = 'creator'
      )
    )
  );

-- DENUNCIAS
-- Cada denuncia es una fila; quien denuncia solo puede crearla, no leerla
-- después (ni la suya ni las de nadie). Las lee el administrador desde la
-- app (con la clave de servicio, ver /community/reports) y le llega un
-- correo si está configurado Resend.
--
-- Si se borra la cuenta denunciada, la denuncia ya no tiene sobre quién
-- actuar y se va con ella; si se borra la de quien denunció, la denuncia se
-- queda (sigue siendo útil) pero sin saber de quién era.
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason text not null
    check (reason in ('spam', 'harassment', 'inappropriate', 'impersonation', 'other')),
  details text check (char_length(details) <= 1000),
  -- Desde dónde se denunció, y qué publicación si fue desde el Feed.
  context text not null
    check (context in ('profile', 'friend_request', 'session_share', 'weekly_goal_share', 'group')),
  content_id uuid,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (reporter_id is null or reporter_id <> reported_id)
);

create index if not exists user_reports_open_idx
  on public.user_reports (created_at desc) where status = 'open';
create index if not exists user_reports_reporter_idx
  on public.user_reports (reporter_id, created_at desc);
create index if not exists user_reports_reported_idx on public.user_reports (reported_id);

alter table public.user_reports enable row level security;

-- Freno contra el abuso de denunciar: 20 al día por persona es muchísimo más
-- de lo que nadie necesita de buena fe.
create or replace function private.reports_today(p_reporter uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.user_reports
  where reporter_id = p_reporter and created_at > now() - interval '1 day';
$$;

revoke all on function private.reports_today(uuid) from public;
grant execute on function private.reports_today(uuid) to authenticated;

create policy user_reports_insert_own on public.user_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and resolved_at is null
    and private.reports_today((select auth.uid())) < 20
  );

revoke all on public.user_reports from anon;
revoke select, update, delete on public.user_reports from authenticated;
