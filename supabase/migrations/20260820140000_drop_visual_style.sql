-- Liquid Glass pasa a ser el único estilo visual de la app (permanente) —
-- ya no es elegible en Ajustes, así que la columna que lo guardaba no hace
-- falta. glass_intensity se queda: sigue siendo un ajuste real (cuánto
-- blur/transparencia tiene el efecto), independiente de qué estilo hubiera
-- antes.
alter table public.user_settings drop column visual_style;
