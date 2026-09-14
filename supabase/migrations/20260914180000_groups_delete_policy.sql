-- Permite al dueño de un grupo eliminarlo. El resto de tablas del grupo
-- (group_members, group_weekly_goals → group_weekly_goal_completions,
-- group_activity_events) ya cascadean por FK "on delete cascade" (ver
-- 20260906120000_groups.sql), así que borrar la fila de groups basta para
-- limpiarlo todo.
drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
for delete to authenticated
using (owner_id = auth.uid());
