-- Registro de errores de la app y freno para los avisos por correo.
--
-- Cada error se agrupa por una huella (`fingerprint`, calculada en
-- report-error.ts a partir del tipo de error, el mensaje normalizado y dónde
-- ocurrió): el mismo fallo repetido por diez usuarios es UNA fila con
-- occurrences = 10, no diez filas. Sirve de historial y, sobre todo, de
-- freno: sin él, un fallo en la pantalla de inicio mandaría un correo por
-- cada persona que abriera la app — cientos en una mañana, y el plan
-- gratuito de Resend corta a los 100 al día.
--
-- Solo la clave secreta (service_role) toca esta tabla: RLS activado y sin
-- ninguna política, así que para anon/authenticated es invisible.
create table if not exists public.app_errors (
  fingerprint text primary key,
  source text not null check (source in ('server', 'client')),
  message text not null,
  stack text,
  path text,
  route text,
  context jsonb,
  user_id uuid,
  occurrences integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_emailed_at timestamptz
);

alter table public.app_errors enable row level security;

create index if not exists app_errors_last_emailed_at_idx
  on public.app_errors (last_emailed_at)
  where last_emailed_at is not null;

-- Apunta una ocurrencia y decide si toca mandar correo. Todo en una sola
-- llamada para que dos instancias del servidor que ven el mismo error a la
-- vez no manden dos avisos: el upsert bloquea la fila hasta el final de la
-- transacción, así que la segunda espera y ya ve `last_emailed_at` puesto.
--
-- Reglas del freno:
--   · el mismo error, como mucho un correo por hora (el siguiente dice
--     cuántas veces se ha repetido mientras tanto);
--   · en total, como mucho 20 correos por hora entre todos los errores —
--     tope de seguridad por si algo revienta por veinte sitios a la vez o
--     alguien se pone a mandar errores falsos al endpoint público.
create or replace function public.record_app_error(
  p_fingerprint text,
  p_source text,
  p_message text,
  p_stack text,
  p_path text,
  p_route text,
  p_context jsonb,
  p_user_id uuid
)
returns table (should_email boolean, occurrences integer, first_seen_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.app_errors;
  v_emailed_last_hour integer;
begin
  insert into public.app_errors as e
    (fingerprint, source, message, stack, path, route, context, user_id)
  values
    (p_fingerprint, p_source, p_message, p_stack, p_path, p_route, p_context, p_user_id)
  on conflict (fingerprint) do update set
    occurrences = e.occurrences + 1,
    last_seen_at = now(),
    message = excluded.message,
    stack = coalesce(excluded.stack, e.stack),
    path = excluded.path,
    route = coalesce(excluded.route, e.route),
    context = excluded.context,
    user_id = coalesce(excluded.user_id, e.user_id)
  returning * into v_row;

  if v_row.last_emailed_at is not null
     and v_row.last_emailed_at > now() - interval '1 hour' then
    return query select false, v_row.occurrences, v_row.first_seen_at;
    return;
  end if;

  select count(*) into v_emailed_last_hour
  from public.app_errors a
  where a.last_emailed_at > now() - interval '1 hour';

  if v_emailed_last_hour >= 20 then
    return query select false, v_row.occurrences, v_row.first_seen_at;
    return;
  end if;

  update public.app_errors a
  set last_emailed_at = now()
  where a.fingerprint = p_fingerprint;

  return query select true, v_row.occurrences, v_row.first_seen_at;
end;
$$;

-- Supabase concede EXECUTE a anon/authenticated por defecto en las funciones
-- nuevas de public; revocar de PUBLIC no basta, hay que nombrarlos.
revoke all on function public.record_app_error(text, text, text, text, text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.record_app_error(text, text, text, text, text, text, jsonb, uuid)
  to service_role;
