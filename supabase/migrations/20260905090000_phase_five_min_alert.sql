-- Aviso de "quedan 5 minutos" para la fase activa — además del ya existente
-- aviso de "fase completada" (phase_alert_sent/qstash_message_id). Es un
-- segundo mensaje QStash independiente, por eso necesita su propia columna
-- de id: transitionBlock/extendActiveBlock/pauseActiveBlock/resumeActiveBlock
-- ya cancelan y reemplazan qstash_message_id cada vez que cambia el tiempo
-- restante de la fase, y este aviso tiene que poder cancelarse/reprogramarse
-- por separado sin pisar ese slot. phase_five_min_alert_sent es el mismo
-- cinturón de seguridad que phase_alert_sent: evita reenviar el aviso si
-- QStash reintenta la entrega.
alter table public.session_blocks
  add column if not exists phase_five_min_alert_sent boolean not null default false;

alter table public.session_blocks
  add column if not exists qstash_five_min_message_id text;
