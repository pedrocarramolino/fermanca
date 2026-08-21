-- Nuevo tipo de evento cooperativo: eliminar una fase pendiente (swipe en
-- RemainingPhasesList) — se replica en la sesión gemela igual que
-- phase_added/phases_reordered.
alter table public.session_events drop constraint session_events_type_check;
alter table public.session_events add constraint session_events_type_check check (type in (
  'paused', 'resumed', 'phase_confirmed', 'time_extended',
  'phase_added', 'phases_reordered', 'phase_removed', 'session_finished'
));
