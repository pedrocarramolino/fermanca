-- Fase 13: aviso de "fase terminada" también por push real (no solo el aviso
-- local del JS de la página, que no se ejecuta con el móvil bloqueado).
-- El "cuándo toca" se calcula a partir de columnas que ya existen
-- (started_at + planned_duration_seconds), no hace falta guardar un
-- timestamp aparte. Este flag evita que el cron reenvíe el mismo aviso en
-- cada pasada mientras el bloque siga sin confirmarse.
alter table public.session_blocks
  add column if not exists phase_alert_sent boolean not null default false;
