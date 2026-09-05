-- Permite editar un anuncio, pero solo a un administrador y solo dentro de
-- las 24h siguientes a publicarlo — pasado ese plazo, ni el propio autor
-- puede tocarlo. `created_at` no se toca en la actualización (solo cambia
-- `body`), así que el mismo check en `with check` sigue viendo la fecha de
-- publicación original, no la del intento de edición.
drop policy if exists "announcements_update_admin_recent" on public.announcements;
create policy "announcements_update_admin_recent" on public.announcements
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.owner_id = auth.uid() and p.is_admin)
  and created_at > now() - interval '24 hours'
)
with check (
  exists (select 1 from public.profiles p where p.owner_id = auth.uid() and p.is_admin)
  and created_at > now() - interval '24 hours'
);
