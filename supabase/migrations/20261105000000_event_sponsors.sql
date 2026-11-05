-- ==============================================================================
-- Sponsors and partners, and what each one has agreed to pay
-- ==============================================================================
-- Amounts are in paise, like event_ticket_types. Only people who can edit the
-- event can read this table, because it holds money and contact details. The
-- public website reads a few safe columns through the service role, never the
-- amounts. Idempotent.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL DEFAULT 'sponsor' CHECK (kind IN ('sponsor', 'partner')),
  name            TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  tier            TEXT CHECK (tier IS NULL OR char_length(tier) <= 60),
  amount_agreed   BIGINT NOT NULL DEFAULT 0 CHECK (amount_agreed >= 0),
  amount_received BIGINT NOT NULL DEFAULT 0 CHECK (amount_received >= 0),
  due_date        DATE,
  contact_name    TEXT CHECK (contact_name IS NULL OR char_length(contact_name) <= 120),
  contact_email   TEXT CHECK (contact_email IS NULL OR char_length(contact_email) <= 254),
  contact_phone   TEXT CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 24),
  website_url     TEXT CHECK (website_url IS NULL OR (char_length(website_url) <= 300 AND website_url ~* '^https?://')),
  notes           TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  show_on_website BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_sponsors_received_within_agreed CHECK (amount_received <= amount_agreed)
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event ON public.event_sponsors (event_id, created_at);

ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_sponsors FROM anon;

DROP POLICY IF EXISTS "Event managers read sponsors" ON public.event_sponsors;
CREATE POLICY "Event managers read sponsors" ON public.event_sponsors
  FOR SELECT TO authenticated
  USING (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsors.event_id), 'events.update'));

DROP POLICY IF EXISTS "Event managers add sponsors" ON public.event_sponsors;
CREATE POLICY "Event managers add sponsors" ON public.event_sponsors
  FOR INSERT TO authenticated
  WITH CHECK (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsors.event_id), 'events.update'));

DROP POLICY IF EXISTS "Event managers update sponsors" ON public.event_sponsors;
CREATE POLICY "Event managers update sponsors" ON public.event_sponsors
  FOR UPDATE TO authenticated
  USING (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsors.event_id), 'events.update'))
  WITH CHECK (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsors.event_id), 'events.update'));

DROP POLICY IF EXISTS "Event managers delete sponsors" ON public.event_sponsors;
CREATE POLICY "Event managers delete sponsors" ON public.event_sponsors
  FOR DELETE TO authenticated
  USING (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = event_sponsors.event_id), 'events.update'));
