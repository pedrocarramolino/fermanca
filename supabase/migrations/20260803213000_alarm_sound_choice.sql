-- Nueva opción de sonido "alarma" (repite pitidos durante
-- visual_alert_duration_ms en vez de un tono corto) — pensada para que no
-- pase desapercibido el aviso de fase/sesión terminada.
alter type public.sound_choice add value if not exists 'alarm';
