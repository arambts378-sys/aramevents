-- Migration: 20261010000001_organizer_email_verification.sql
-- Description: Dedicated verification challenges table for organizer onboarding and email OTP verification with secure hashing and rate limiting metadata.

CREATE TABLE IF NOT EXISTS public.organizer_verification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'organizer_registration',
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_ip_hash TEXT
);

-- Performance & Rate Limiting Indexes
CREATE INDEX IF NOT EXISTS idx_organizer_challenges_email_created 
  ON public.organizer_verification_challenges(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organizer_challenges_ip_created 
  ON public.organizer_verification_challenges(request_ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organizer_challenges_email_purpose 
  ON public.organizer_verification_challenges(email, purpose);

-- Security: Enable RLS. Only Server/Admin client (service role) can read/write this table.
ALTER TABLE public.organizer_verification_challenges ENABLE ROW LEVEL SECURITY;

-- No public policies granted: completely locked down from anon and authenticated client roles.
