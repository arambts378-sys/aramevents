-- ==============================================================================
-- 18% GST on sponsor and partner payments, and GST tax invoices
-- ==============================================================================
-- Sponsor/partner amounts (packages and custom amounts) are before tax; 18% GST is
-- added on top when paying online. Organizers enter their GST details per event;
-- sponsors may give their GSTIN. Invoices keep a snapshot of the tax split:
-- CGST 9% + SGST 9% within one state, IGST 18% across states.
-- Ticket payments are unchanged (no GST added). Additive and idempotent.
-- ==============================================================================

ALTER TABLE public.event_registration_settings
  ADD COLUMN IF NOT EXISTS seller_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_gstin TEXT,
  ADD COLUMN IF NOT EXISTS seller_address TEXT;

ALTER TABLE public.event_registration_settings DROP CONSTRAINT IF EXISTS event_registration_settings_seller_gstin_check;
ALTER TABLE public.event_registration_settings
  ADD CONSTRAINT event_registration_settings_seller_gstin_check
  CHECK (seller_gstin IS NULL OR seller_gstin ~ '^[0-9]{2}[A-Z0-9]{13}$');

ALTER TABLE public.sponsor_payments
  ADD COLUMN IF NOT EXISTS base_amount BIGINT,
  ADD COLUMN IF NOT EXISTS gst_amount BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.event_sponsors ADD COLUMN IF NOT EXISTS gstin TEXT;

ALTER TABLE public.payment_invoices
  ADD COLUMN IF NOT EXISTS subtotal BIGINT,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_gstin TEXT,
  ADD COLUMN IF NOT EXISTS seller_address TEXT,
  ADD COLUMN IF NOT EXISTS buyer_gstin TEXT;
