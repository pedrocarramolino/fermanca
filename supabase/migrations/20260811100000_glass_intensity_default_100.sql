-- El 70 original era el valor por defecto equivocado: el aspecto fijo que
-- ya existía (y que se verificó y aprobó) antes de este slider equivalía a
-- intensidad 100, no 70 — con 70 el efecto se nota bastante menos (menos
-- blur, más opaco). Se corrige el default para nuevas filas y se actualizan
-- las filas que aún tengan el 70 heredado del default anterior (nadie ha
-- tenido ocasión de elegir 70 a propósito, la funcionalidad es nueva).
alter table public.user_settings
  alter column glass_intensity set default 100;

update public.user_settings
  set glass_intensity = 100
  where glass_intensity = 70;
