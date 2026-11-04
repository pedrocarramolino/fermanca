-- Recordatorios y avisos de calendario sin un Schedule de QStash por cada
-- uno: el plan gratuito de QStash solo admite 10 Schedules para toda la app
-- y el 3/11/2026 se llenó ("quota maxSchedules exceeded, current limit:
-- 10"), así que nadie más podía crear un recordatorio.
--
-- Ahora pg_cron llama cada minuto a /api/cron/notifications, que pide aquí
-- lo que toca enviar (claim_due_notifications) y manda los push. Lo que se
-- devuelve queda marcado en la misma sentencia, así que dos llamadas
-- seguidas nunca mandan el mismo aviso dos veces.

alter table public.reminders add column if not exists last_fired_at timestamptz;
alter table public.calendar_events add column if not exists notified_at timestamptz;

-- Los avisos de calendario que ya pasaron se enviaron por QStash: que el
-- nuevo sistema no los vuelva a mandar.
update public.calendar_events set notified_at = notify_at
where notify_at is not null and notify_at <= now() and notified_at is null;

-- Cambiar la hora del aviso de un evento lo vuelve a dejar pendiente.
create or replace function private.reset_calendar_event_notified()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.notify_at is distinct from old.notify_at then
    new.notified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_events_reset_notified on public.calendar_events;
create trigger calendar_events_reset_notified
before update of notify_at on public.calendar_events
for each row execute function private.reset_calendar_event_notified();

/**
 * Lo que hay que avisar en `p_now`, marcado ya como enviado.
 *  · Recordatorios: la hora local del usuario (user_settings.timezone, o
 *    Europe/Madrid si no hay o no es válida) ha llegado a time_of_day en un
 *    día marcado, con 10 minutos de margen por si pg_cron se retrasa; se
 *    mira también el día anterior para las horas justo antes de medianoche.
 *    last_fired_at impide repetirlo dentro de esa ventana.
 *  · Calendario: notify_at ya pasó (como mucho hace un día) y no se avisó.
 */
create or replace function public.claim_due_notifications(p_now timestamptz default now())
returns table (kind text, id uuid, owner_id uuid, title text)
language sql
security definer
set search_path = public
as $$
  with tz as (
    select r.id, coalesce(
      (select n.name from pg_timezone_names n where n.name = us.timezone),
      'Europe/Madrid'
    ) as zone
    from public.reminders r
    left join public.user_settings us on us.owner_id = r.owner_id
    where r.enabled and cardinality(r.days_of_week) > 0
  ),
  due_reminders as (
    select r.id
    from public.reminders r
    join tz on tz.id = r.id
    cross join lateral (
      select ((p_now at time zone tz.zone)::date - d) as day
      from generate_series(0, 1) as d
    ) days
    where extract(dow from days.day)::smallint = any (r.days_of_week)
      and p_now >= ((days.day + r.time_of_day) at time zone tz.zone)
      and p_now < ((days.day + r.time_of_day) at time zone tz.zone) + interval '10 minutes'
      and (r.last_fired_at is null or r.last_fired_at < p_now - interval '15 minutes')
  ),
  fired_reminders as (
    update public.reminders r set last_fired_at = p_now
    where r.id in (select id from due_reminders)
    returning 'reminder'::text as kind, r.id, r.owner_id, null::text as title
  ),
  fired_events as (
    update public.calendar_events e set notified_at = p_now
    where e.notified_at is null
      and e.notify_at is not null
      and e.notify_at <= p_now
      and e.notify_at > p_now - interval '1 day'
    returning 'calendar_event'::text as kind, e.id, e.owner_id, e.title
  )
  select * from fired_reminders
  union all
  select * from fired_events;
$$;

revoke all on function public.claim_due_notifications(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz) to service_role;

-- La clave con la que pg_cron se identifica ante /api/cron/notifications. Se
-- genera aquí y vive solo en Vault: la ruta la comprueba con esta función
-- (vía la clave de servicio), así que no hace falta copiarla a Vercel.
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'notifications_cron_secret',
  'Autenticación de pg_cron ante /api/cron/notifications'
)
where not exists (select 1 from vault.secrets where name = 'notifications_cron_secret');

create or replace function public.verify_notifications_cron_secret(p_secret text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select decrypted_secret = p_secret
     from vault.decrypted_secrets
     where name = 'notifications_cron_secret'),
    false
  );
$$;

revoke all on function public.verify_notifications_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_notifications_cron_secret(text) to service_role;

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'dispatch-notifications',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://fermanca.com/api/cron/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'notifications_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);
