-- ==============================================================================
-- Restore public.generate_registration_number(uuid)
-- ==============================================================================
-- 20261020000000_security_remediation_suite rewrote submit_event_registration to
-- call this function, but no migration ever created it, so every public
-- registration failed with "function public.generate_registration_number(uuid)
-- does not exist". Same ARAM-REG-XXXXXXXX format as the inline generator it
-- replaced, retried until it misses the unique index on registration_number.
-- Idempotent.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.generate_registration_number(p_event_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_number TEXT;
BEGIN
  -- p_event_id is unused today; it keeps the call site stable if numbers ever become per-event.
  LOOP
    v_number := 'ARAM-REG-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.registrations WHERE registration_number = v_number
    );
  END LOOP;
  RETURN v_number;
END;
$$;

-- Only called from inside SECURITY DEFINER registration functions, which run as
-- the owner; nothing needs to call it over the API.
REVOKE ALL ON FUNCTION public.generate_registration_number(UUID)
  FROM PUBLIC, anon, authenticated;
