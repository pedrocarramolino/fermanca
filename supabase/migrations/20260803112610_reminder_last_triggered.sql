-- PracticeFlow — evita que un cron menos frecuente que "cada minuto" (p. ej.
-- cada 5 min en la alternativa gratuita por GitHub Actions) reenvíe el mismo
-- recordatorio varias veces dentro de su ventana de tolerancia.
alter table public.reminders
  add column if not exists last_triggered_on date;
