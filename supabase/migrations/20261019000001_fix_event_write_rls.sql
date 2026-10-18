-- Replace membership-only event write policies with role-permission checks.
DROP POLICY IF EXISTS "Users can insert events in their workspaces" ON public.events;
DROP POLICY IF EXISTS "Users can update events in their workspaces" ON public.events;
DROP POLICY IF EXISTS "Users can delete events in their workspaces" ON public.events;

CREATE POLICY "Users can insert events in their workspaces"
  ON public.events FOR INSERT
  WITH CHECK (public.has_permission(workspace_id, 'events.create'));

CREATE POLICY "Users can update events in their workspaces"
  ON public.events FOR UPDATE
  USING (public.has_permission(workspace_id, 'events.update'))
  WITH CHECK (public.has_permission(workspace_id, 'events.update'));

CREATE POLICY "Users can delete events in their workspaces"
  ON public.events FOR DELETE
  USING (public.has_permission(workspace_id, 'events.delete'));
