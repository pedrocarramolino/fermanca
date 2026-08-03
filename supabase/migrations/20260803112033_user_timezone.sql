-- PracticeFlow — zona horaria del usuario, necesaria para que el cron de
-- recordatorios compare la hora local correcta (sin esto, "18:00" solo
-- coincidiría con la hora real en UTC). Se detecta y guarda sola desde el
-- navegador (Intl.DateTimeFormat), el usuario no la elige a mano.
alter table public.user_settings
  add column if not exists timezone text not null default 'UTC';
