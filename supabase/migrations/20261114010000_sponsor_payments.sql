-- ==============================================================================
-- Online payment for sponsor and partner packages
-- ==============================================================================
-- sponsor_payments records each Razorpay order the server creates for a paid
-- sponsor/partner package. The server marks a row 'paid' only after checking
-- Razorpay's signature and the payment itself; the sponsor request then uses it
-- once ('used', linked to the event_sponsors row it paid for). If the request
-- cannot be saved the payment is refunded ('refunded').
-- Only the service role touches this table. Idempotent.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.event_sponsor_packages(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'used', 'failed', 'refunded')),
  sponsor_id UUID REFERENCES public.event_sponsors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sponsor_payments_event ON public.sponsor_payments(event_id, status);
CREATE INDEX IF NOT EXISTS idx_sponsor_payments_sponsor ON public.sponsor_payments(sponsor_id);

ALTER TABLE public.sponsor_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sponsor_payments FROM anon, authenticated;
