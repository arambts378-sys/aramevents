-- ==============================================================================
-- Custom sponsorship amounts, partner requests without a package, and invoices
-- ==============================================================================
-- 1. event_registration_settings: organizers choose whether sponsors may pay an
--    amount of their choice (with a minimum) and whether partners may apply
--    without a package. Both on by default.
-- 2. sponsor_payments.package_id becomes optional (custom amounts have none).
-- 3. ticket_payments / sponsor_payments remember how the payer paid (UPI, card...).
-- 4. payment_invoices: one numbered invoice per completed online payment, opened
--    with an unguessable token. Written only by the service role; organizers of the
--    event can read theirs. Idempotent.
-- ==============================================================================

ALTER TABLE public.event_registration_settings
  ADD COLUMN IF NOT EXISTS accept_custom_sponsorship BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS custom_sponsorship_min BIGINT NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS accept_partner_requests BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.event_registration_settings DROP CONSTRAINT IF EXISTS event_registration_settings_custom_min_check;
ALTER TABLE public.event_registration_settings
  ADD CONSTRAINT event_registration_settings_custom_min_check CHECK (custom_sponsorship_min >= 100);

ALTER TABLE public.sponsor_payments ALTER COLUMN package_id DROP NOT NULL;
ALTER TABLE public.sponsor_payments ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'sponsor';
ALTER TABLE public.sponsor_payments DROP CONSTRAINT IF EXISTS sponsor_payments_kind_check;
ALTER TABLE public.sponsor_payments ADD CONSTRAINT sponsor_payments_kind_check CHECK (kind IN ('sponsor', 'partner'));

ALTER TABLE public.ticket_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.ticket_payments ADD COLUMN IF NOT EXISTS payment_method_detail TEXT;
ALTER TABLE public.sponsor_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.sponsor_payments ADD COLUMN IF NOT EXISTS payment_method_detail TEXT;

CREATE SEQUENCE IF NOT EXISTS public.payment_invoice_seq;

CREATE TABLE IF NOT EXISTS public.payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE
    DEFAULT ('INV-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMM') || '-' || lpad(nextval('public.payment_invoice_seq')::text, 6, '0')),
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('ticket', 'sponsor', 'partner')),
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT,
  payment_method TEXT,
  payment_method_detail TEXT,
  buyer_name TEXT,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_organization TEXT,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  sponsor_id UUID REFERENCES public.event_sponsors(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_event ON public.payment_invoices(event_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_sponsor ON public.payment_invoices(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_registration ON public.payment_invoices(registration_id);

ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_invoices FROM anon, authenticated;
GRANT SELECT ON public.payment_invoices TO authenticated;

DROP POLICY IF EXISTS "Event managers read invoices" ON public.payment_invoices;
CREATE POLICY "Event managers read invoices" ON public.payment_invoices
  FOR SELECT TO authenticated
  USING (has_permission((SELECT e.workspace_id FROM public.events e WHERE e.id = payment_invoices.event_id), 'events.update'));
