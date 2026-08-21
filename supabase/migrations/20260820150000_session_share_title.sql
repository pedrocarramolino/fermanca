-- Título opcional para una publicación del Feed — se pone al compartir, no
-- se deriva de la sesión (que no tiene ningún campo "título" propio, solo
-- nombre de plantilla si venía de una).
alter table public.session_shares add column title text check (char_length(title) <= 100);
