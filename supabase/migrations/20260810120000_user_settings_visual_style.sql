-- Estilo visual de la interfaz ("classic" | "glass"), guardado junto al
-- resto de ajustes de personalización — mismo patrón que locale.
alter table public.user_settings
  add column visual_style text not null default 'classic'
    check (visual_style in ('classic', 'glass'));
