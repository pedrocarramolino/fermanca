-- Aviso opcional por push en un día/hora concretos, independientes de la
-- fecha del propio evento (p. ej. avisar 2 días antes a las 18:00) — igual
-- que session_blocks, se guarda el id del mensaje de QStash para poder
-- cancelarlo si el evento se borra antes de que llegue.
alter table public.calendar_events
  add column notify_at timestamptz,
  add column qstash_message_id text;
