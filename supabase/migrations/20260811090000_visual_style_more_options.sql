-- Añade "minimal" y "futuristic" a los estilos visuales disponibles
-- (hasta ahora solo "classic"/"glass").
alter table public.user_settings
  drop constraint if exists user_settings_visual_style_check;

alter table public.user_settings
  add constraint user_settings_visual_style_check
    check (visual_style in ('classic', 'glass', 'minimal', 'futuristic'));
