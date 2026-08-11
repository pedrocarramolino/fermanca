-- Cuánto se nota el efecto Liquid Glass (0-100%) — solo tiene efecto visible
-- cuando visual_style = 'glass'; se guarda igualmente para el resto de
-- estilos por si se reutiliza más adelante.
alter table public.user_settings
  add column glass_intensity smallint not null default 70
    check (glass_intensity between 0 and 100);
