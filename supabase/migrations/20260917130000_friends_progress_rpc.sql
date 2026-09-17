-- Rendimiento de la pantalla de Comunidad: hasta ahora, el progreso de cada
-- amigo (semana, mes, racha) se calculaba en Node trayéndose hasta 1000
-- sesiones COMPLETAS con todos sus bloques por amigo (ver
-- getFriendProgress), solo para sacar tres números. Con N amigos eso son N
-- consultas enormes en cada carga de /community.
--
-- Esta función hace el agregado en Postgres y devuelve una fila por amigo:
-- una sola ida y vuelta, y solo unos pocos bytes por amigo. No lleva
-- parámetros a propósito — deriva todo de auth.uid(), así que no se puede
-- usar para leer el progreso de alguien que no sea amigo aceptado de quien
-- llama, a diferencia de la clave de servicio que usaba el código anterior.
--
-- La aritmética replica exactamente la del dominio (streaks.ts,
-- session-statistics.ts): el "día" es la fecha en UTC, la semana natural
-- empieza en lunes, cuentan las sesiones que no están en curso (incluso las
-- de 0 segundos, que sí mantienen viva la racha) y la racha sigue contando
-- desde ayer si hoy todavía no se ha practicado.
create or replace function public.friends_progress()
returns table (
  friendship_id uuid,
  friend_owner_id uuid,
  username text,
  avatar_url text,
  weekly_seconds bigint,
  monthly_seconds bigint,
  current_streak integer
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select auth.uid() as uid, (now() at time zone 'utc')::date as today
  ),
  friends as (
    select
      f.id as friendship_id,
      case when f.requester_id = me.uid then f.addressee_id else f.requester_id end as friend_owner_id
    from public.friendships f
    cross join me
    where f.status = 'accepted'
      and (f.requester_id = me.uid or f.addressee_id = me.uid)
  ),
  finished as (
    select
      fr.friend_owner_id,
      (s.started_at at time zone 'utc')::date as day,
      s.actual_duration_seconds as seconds,
      date_trunc('week', s.started_at at time zone 'utc') as week_start,
      date_trunc('month', s.started_at at time zone 'utc') as month_start
    from friends fr
    join public.sessions s
      on s.owner_id = fr.friend_owner_id
     and s.status <> 'in_progress'
  ),
  totals as (
    select
      f.friend_owner_id,
      sum(f.seconds) filter (
        where f.week_start = date_trunc('week', me.today::timestamp)
      ) as weekly_seconds,
      sum(f.seconds) filter (
        where f.month_start = date_trunc('month', me.today::timestamp)
      ) as monthly_seconds
    from finished f
    cross join me
    group by f.friend_owner_id
  ),
  practice_days as (
    select distinct friend_owner_id, day from finished
  ),
  -- Islas y huecos: al numerar los días de más reciente a más antiguo,
  -- "día + nº de fila" es constante dentro de un tramo consecutivo.
  runs as (
    select
      friend_owner_id,
      day,
      day + (row_number() over (partition by friend_owner_id order by day desc)) * interval '1 day' as run_key
    from practice_days
  ),
  last_days as (
    select friend_owner_id, max(day) as last_day from practice_days group by friend_owner_id
  ),
  streaks as (
    select r.friend_owner_id, count(*)::int as current_streak
    from runs r
    join last_days l on l.friend_owner_id = r.friend_owner_id
    join runs anchor
      on anchor.friend_owner_id = r.friend_owner_id
     and anchor.day = l.last_day
    cross join me
    where l.last_day >= me.today - 1
      and r.run_key = anchor.run_key
    group by r.friend_owner_id
  )
  select
    fr.friendship_id,
    fr.friend_owner_id,
    p.username,
    p.avatar_url,
    coalesce(t.weekly_seconds, 0) as weekly_seconds,
    coalesce(t.monthly_seconds, 0) as monthly_seconds,
    coalesce(st.current_streak, 0) as current_streak
  from friends fr
  join public.profiles p on p.owner_id = fr.friend_owner_id
  left join totals t on t.friend_owner_id = fr.friend_owner_id
  left join streaks st on st.friend_owner_id = fr.friend_owner_id
  -- Orden estable: la lista de amigos se pinta tal cual llega, y sin esto
  -- dependía del orden en que Postgres recorriera friendships.
  order by lower(p.username);
$$;

-- Sin parámetros y atada a auth.uid(): la llama el propio usuario con su
-- sesión, nunca anon. `revoke ... from public` no basta — Supabase concede
-- EXECUTE a anon/authenticated por privilegios por defecto en cada función
-- nueva de public (mismo caso que email_registered), así que hay que
-- quitárselo a anon explícitamente.
revoke all on function public.friends_progress() from public;
revoke execute on function public.friends_progress() from anon;
grant execute on function public.friends_progress() to authenticated;

-- listByOwner filtra por requester_id/addressee_id con un OR; sin estos
-- índices es un recorrido completo de friendships cada vez (y esta función
-- lo hace en cada carga de Comunidad).
create index if not exists friendships_requester_id_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_id_idx on public.friendships (addressee_id);
