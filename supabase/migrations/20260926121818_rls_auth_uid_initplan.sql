-- RLS: calcular auth.uid() una vez por consulta, no una vez por fila.
--
-- Escrito tal cual, `auth.uid()` dentro de una regla de RLS se vuelve a
-- evaluar para cada fila que Postgres mira. Envuelto en `(select
-- auth.uid())` se convierte en un "initplan": se calcula una sola vez al
-- empezar la consulta y se reutiliza. Es la corrección que recomienda el
-- asesor de rendimiento de Supabase (lint 0003_auth_rls_initplan), que
-- marcaba las 51 reglas de public que usan auth.uid().
--
-- El significado no cambia: auth.uid() devuelve lo mismo durante toda la
-- consulta, así que da igual calcularlo una vez o mil. Comprobado antes de
-- aplicarlo, en una transacción deshecha:
--   · lectura: lo que ve cada uno de los 153 usuarios en cada una de las 24
--     tablas con RLS (3.672 combinaciones, 5.560 filas) → 0 diferencias;
--   · escritura: crear/cambiar lo propio sigue permitido; crear sesiones a
--     nombre de otro, tocar sus ajustes o sus sesiones, o mandar una
--     solicitud de amistad haciéndose pasar por otro, sigue bloqueado.
-- Medido con datos de prueba: sumar 100.000 bloques de sesión, 149 → 52 ms;
-- historial de 1.000 sesiones con sus bloques, 35 → 18 ms. En reglas
-- sencillas (`owner_id = auth.uid()` con índice) no cambia nada apreciable.
--
-- Se hace sobre lo que hay en pg_policies en vez de reescribir las 51
-- reglas a mano: la expresión de cada una se toma tal cual y solo se
-- sustituye la llamada, así que no hay forma de que una regla cambie por
-- una errata. El `(?<!SELECT )` hace que sea idempotente: una llamada ya
-- envuelta, que Postgres guarda como `( SELECT auth.uid() AS uid)`, no se
-- vuelve a tocar.
--
-- Las reglas nuevas deberían escribirse ya con `(select auth.uid())`.
do $$
declare p record; q text; c text;
begin
  for p in
    select policyname, tablename, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ '(?<!SELECT )auth\.uid\(\)'
        or coalesce(with_check, '') ~ '(?<!SELECT )auth\.uid\(\)')
  loop
    q := regexp_replace(p.qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    c := regexp_replace(p.with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    execute format('alter policy %I on public.%I', p.policyname, p.tablename)
      || case when q is not null then format(' using (%s)', q) else '' end
      || case when c is not null then format(' with check (%s)', c) else '' end;
  end loop;
end $$;
