-- ==============================================================================
-- Razorpay webhook: finish bookings when the buyer's browser does not come back
-- ==============================================================================
-- Each order keeps the details the buyer typed (checkout_payload) so the webhook can
-- complete the registration or sponsor request on the server if the buyer closes the
-- tab right after paying. Cleared once the booking is done or refunded.
-- Only the service role reads these tables. Additive and idempotent.
-- ==============================================================================

ALTER TABLE public.ticket_payments ADD COLUMN IF NOT EXISTS checkout_payload JSONB;
ALTER TABLE public.sponsor_payments ADD COLUMN IF NOT EXISTS checkout_payload JSONB;
