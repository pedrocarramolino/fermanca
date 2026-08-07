-- Pausar una fase solo cancelaba el aviso QStash, sin guardar nada — al
-- recargar la página o volver más tarde, el cronómetro se recalculaba desde
-- started_at como si hubiera seguido corriendo todo ese rato. Este campo
-- congela cuánto quedaba en el instante exacto de la pausa; null significa
-- "no está en pausa" (el bloque sigue el cálculo normal por started_at).
alter table public.session_blocks
  add column if not exists paused_remaining_seconds integer;
