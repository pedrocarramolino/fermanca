-- Feed: pedir solo lo de quien mira y sus amigos, no filtrar toda la tabla.
--
-- Hasta ahora el Feed hacía `select * from session_shares order by
-- created_at desc limit 30` y dejaba que la RLS descartase lo que no era
-- suyo ni de un amigo. Funcionaba, pero para eso Postgres recorría TODAS
-- las publicaciones de la app (de cualquier usuario) y comprobaba la
-- amistad fila a fila: el coste crecía con el tamaño de la app, no con
-- tus amigos. Medido con 200.000 publicaciones de prueba (en una
-- transacción deshecha): 1.092 ms por carga del Feed, frente a 1,8 ms con
-- estas funciones, devolviendo exactamente las mismas filas.
--
-- Cómo: se calcula primero la lista de autores (tú + amigos aceptados) y,
-- por cada uno, se leen solo sus N publicaciones más recientes con el
-- índice (owner_id, created_at desc) que ya existía. El trabajo queda
-- acotado a (amigos + 1) × N, da igual cuántas publicaciones haya en total.
--
-- SECURITY INVOKER a propósito: la RLS de las tablas sigue aplicándose
-- igual que antes, así que estas funciones no pueden enseñar nada que la
-- consulta anterior no enseñara. El filtro explícito es solo para que
-- Postgres use el índice, no un cambio de permisos.
create or replace function public.feed_session_shares(p_limit integer)
returns setof public.session_shares
language sql
stable
security invoker
set search_path = ''
as $$
  with authors as (
    select (select auth.uid()) as owner_id
    union
    select case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted'
      and (f.requester_id = (select auth.uid()) or f.addressee_id = (select auth.uid()))
  )
  select s.*
  from authors a
  cross join lateral (
    select *
    from public.session_shares x
    where x.owner_id = a.owner_id
    order by x.created_at desc
    limit least(greatest(p_limit, 1), 100)
  ) s
  order by s.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.feed_weekly_goal_shares(p_limit integer)
returns setof public.weekly_goal_shares
language sql
stable
security invoker
set search_path = ''
as $$
  with authors as (
    select (select auth.uid()) as owner_id
    union
    select case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted'
      and (f.requester_id = (select auth.uid()) or f.addressee_id = (select auth.uid()))
  )
  select s.*
  from authors a
  cross join lateral (
    select *
    from public.weekly_goal_shares x
    where x.owner_id = a.owner_id
    order by x.created_at desc
    limit least(greatest(p_limit, 1), 100)
  ) s
  order by s.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- Sin sesión no hay nada que ver (auth.uid() es null y la RLS lo corta
-- todo), pero no hay por qué dejar que anon las llame.
revoke execute on function public.feed_session_shares(integer) from public, anon;
revoke execute on function public.feed_weekly_goal_shares(integer) from public, anon;
grant execute on function public.feed_session_shares(integer) to authenticated;
grant execute on function public.feed_weekly_goal_shares(integer) to authenticated;
