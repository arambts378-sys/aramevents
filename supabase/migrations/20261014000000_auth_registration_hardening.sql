-- Persist the mandatory organizer phone number on the profile created by the auth trigger.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Serialize OTP issuance per normalized email and purpose. The 45-second cooldown check,
-- prior-challenge invalidation, and insert must be one transaction to avoid racing codes.
CREATE OR REPLACE FUNCTION public.create_organizer_verification_challenge(
  p_email TEXT,
  p_otp_hash TEXT,
  p_purpose TEXT,
  p_expires_at TIMESTAMPTZ,
  p_max_attempts INT,
  p_request_ip_hash TEXT
)
RETURNS TABLE (challenge_id UUID, created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(btrim(p_email));
  latest_id UUID;
  latest_sent_at TIMESTAMPTZ;
  new_id UUID;
BEGIN
  IF normalized_email IS NULL OR normalized_email = '' OR p_otp_hash IS NULL OR p_purpose IS NULL THEN
    RAISE EXCEPTION 'Invalid verification challenge input';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(normalized_email || ':' || p_purpose, 0)
  );

  SELECT id, last_sent_at
  INTO latest_id, latest_sent_at
  FROM public.organizer_verification_challenges
  WHERE email = normalized_email
    AND purpose = p_purpose
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF latest_id IS NOT NULL AND latest_sent_at > now() - INTERVAL '45 seconds' THEN
    RETURN QUERY SELECT latest_id, false;
    RETURN;
  END IF;

  UPDATE public.organizer_verification_challenges
  SET expires_at = now() - INTERVAL '1 second'
  WHERE email = normalized_email
    AND purpose = p_purpose
    AND verified_at IS NULL
    AND expires_at > now();

  INSERT INTO public.organizer_verification_challenges (
    email,
    otp_hash,
    purpose,
    expires_at,
    attempt_count,
    max_attempts,
    verified_at,
    last_sent_at,
    request_ip_hash
  )
  VALUES (
    normalized_email,
    p_otp_hash,
    p_purpose,
    p_expires_at,
    0,
    p_max_attempts,
    NULL,
    now(),
    p_request_ip_hash
  )
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organizer_verification_challenge(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organizer_verification_challenge(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT
) TO service_role;
