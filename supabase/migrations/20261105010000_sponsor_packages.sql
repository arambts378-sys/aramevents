-- ==============================================================================
-- Sponsor and partner packages, and requests from the public registration form
-- ==============================================================================
-- Organizers offer packages at a set price. Anyone can request one on the
-- registration page, which adds a pending row to event_sponsors through a server
-- action using the service role. The public gets no direct table access. Idempotent.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.event_sponsor_packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'sponsor' CHECK (kind IN ('sponsor', 'partner')),
  name        TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  amount      BIGINT NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_sponsor_packages_event ON public.event_sponsor_packages (event_id, kind, amount DESC);

ALTER TABLE public.event_sponsor_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_sponsor_packages FROM anon;

DROP POLICY IF EXISTS "Event managers read packages" ON public.event_sponsor_packages;
CREATE POLICY "Event managers read packages" ON public.event_sponsor_packages
  FOR SELECT TO authenticated
  USING (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsor_packages.event_id), 'events.update'));

DROP POLICY IF EXISTS "Event managers add packages" ON public.event_sponsor_packages;
CREATE POLICY "Event managers add packages" ON public.event_sponsor_packages
  FOR INSERT TO authenticated
  WITH CHECK (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsor_packages.event_id), 'events.update'));

DROP POLICY IF EXISTS "Event managers update packages" ON public.event_sponsor_packages;
CREATE POLICY "Event managers update packages" ON public.event_sponsor_packages
  FOR UPDATE TO authenticated
  USING (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsor_packages.event_id), 'events.update'))
  WITH CHECK (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsor_packages.event_id), 'events.update'));

DROP POLICY IF EXISTS "Event managers delete packages" ON public.event_sponsor_packages;
CREATE POLICY "Event managers delete packages" ON public.event_sponsor_packages
  FOR DELETE TO authenticated
  USING (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsor_packages.event_id), 'events.update'));

-- Existing rows were added by organizers, so they count as approved.
ALTER TABLE public.event_sponsors
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.event_sponsor_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE public.event_sponsors DROP CONSTRAINT IF EXISTS event_sponsors_request_status_check;
ALTER TABLE public.event_sponsors
  ADD CONSTRAINT event_sponsors_request_status_check CHECK (request_status IN ('pending', 'approved', 'declined'));
