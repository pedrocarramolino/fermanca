-- PracticeFlow — categorías fijas del sistema.
-- El color coincide con los tokens --category-* definidos en
-- src/app/globals.css (variante clara) para que la BD y el design system
-- no se desincronicen. slug es estable: el dominio TS lo usa como
-- identificador, nunca el id (que puede diferir entre entornos).

insert into public.categories (kind, slug, name, color) values
  ('system', 'warmup', 'Calentamiento', 'oklch(0.7 0.16 55)'),
  ('system', 'flexibility', 'Flexibilidad', 'oklch(0.6 0.16 230)'),
  ('system', 'technique', 'Técnica', 'oklch(0.55 0.2 300)'),
  ('system', 'repertoire', 'Obras', 'oklch(0.6 0.2 350)');
