-- Aviso de recordatorio si, dos minutos después del aviso de "fase
-- completada", el bloque sigue sin confirmarse (activo, sin transicionar a
-- la siguiente fase). Mismo patrón que phase_alert_sent: evita reenviar el
-- mismo recordatorio si QStash reintenta la entrega.
alter table public.session_blocks
  add column if not exists phase_reminder_sent boolean not null default false;
