-- En archivo aparte a propósito: Postgres no permite usar un valor de enum
-- recién añadido (ver 20260803213000_alarm_sound_choice.sql) dentro de la
-- misma transacción en la que se añadió.
alter table public.user_settings alter column sound set default 'alarm';
