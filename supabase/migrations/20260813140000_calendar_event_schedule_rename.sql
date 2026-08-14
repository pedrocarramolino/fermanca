-- QStash rechaza `notBefore`/`delay` a más de 7 días vista (límite del plan
-- actual) — un aviso puntual programado con un mensaje normal fallaba para
-- cualquier evento a más de una semana. Los Schedules (cron) no tienen ese
-- límite, así que el aviso pasa a programarse como un Schedule de un solo
-- disparo (se autoborra tras entregarse, ver calendar-event-alert), igual
-- que ya hace `reminders` para los recordatorios recurrentes — de ahí que la
-- columna se renombre para llamarse igual que la suya.
alter table public.calendar_events
  rename column qstash_message_id to qstash_schedule_id;
