-- Quinta categoría fija del sistema — Vocalizaciones, para el trabajo vocal
-- que ahora usa la intención "repertorio" de Pulso (calentamiento +
-- vocalizaciones + flexibilidad, ver generate-plan.ts). Mismo patrón que
-- 20260803075107_seed_system_categories.sql: fila global (owner_id null),
-- compartida por todos los usuarios vía la RLS existente
-- (categories_select_system_or_own ya deja pasar cualquier kind = 'system').
-- Color reutilizado de la paleta ya validada (Verde, ver category-colors.ts)
-- en vez de uno nuevo sin comprobar contraste/CVD frente al resto.

insert into public.categories (kind, slug, name, color) values
  ('system', 'vocalization', 'Vocalizaciones', 'oklch(0.62 0.15 135)');
