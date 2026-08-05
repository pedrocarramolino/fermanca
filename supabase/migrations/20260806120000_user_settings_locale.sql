-- Idioma de la interfaz, guardado junto al resto de ajustes de
-- personalización (tema, sonido, acento) — mismo patrón, mismo sitio.
alter table public.user_settings
  add column locale text not null default 'es'
    check (locale in ('es', 'en', 'de'));
