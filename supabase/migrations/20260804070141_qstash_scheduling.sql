-- Sustituye el sondeo por cron (GitHub Actions) por QStash: mensajes
-- diferidos de un solo uso para el fin de fase, y un Schedule por
-- recordatorio. last_triggered_on deja de hacer falta porque QStash es la
-- única fuente de verdad sobre cuándo dispara cada recordatorio.
alter table session_blocks add column qstash_message_id text;
alter table reminders add column qstash_schedule_id text;
alter table reminders drop column last_triggered_on;
