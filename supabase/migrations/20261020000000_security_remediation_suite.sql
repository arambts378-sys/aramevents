-- ==============================================================================
-- ARAM BTS: Complete Security Vulnerability Remediation Suite
-- Migration: 20261020000000_security_remediation_suite.sql
-- Description: Consolidated remediations for C1, H1-H6, M1-M15, L1-L17, and functional bugs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. H5, H6, M2: Concurrency-Safe OTP Accounting & Pending Payload
-- ------------------------------------------------------------------------------

ALTER TABLE public.organizer_verification_challenges
ADD COLUMN IF NOT EXISTS pending_payload TEXT;

CREATE OR REPLACE FUNCTION public.create_organizer_verification_challenge(
  p_email TEXT,
  p_otp_hash TEXT,
  p_purpose TEXT,
  p_expires_at TIMESTAMPTZ,
  p_max_attempts INT,
  p_request_ip_hash TEXT,
  p_pending_payload TEXT DEFAULT NULL
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
    request_ip_hash,
    pending_payload
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
    p_request_ip_hash,
    p_pending_payload
  )
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organizer_verification_challenge(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organizer_verification_challenge(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_organizer_verification_challenge(
  p_email TEXT,
  p_purpose TEXT,
  p_otp_hash TEXT
)
RETURNS TABLE (
  status TEXT,
  challenge_id UUID,
  attempts_remaining INT,
  pending_payload TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(btrim(p_email));
  rec RECORD;
  new_attempt_count INT;
BEGIN
  IF normalized_email IS NULL OR normalized_email = '' OR p_otp_hash IS NULL OR p_purpose IS NULL THEN
    RETURN QUERY SELECT 'NOT_FOUND'::TEXT, NULL::UUID, 0, NULL::TEXT;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(normalized_email || ':' || p_purpose, 0)
  );

  SELECT *
  INTO rec
  FROM public.organizer_verification_challenges
  WHERE email = normalized_email
    AND purpose = p_purpose
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF rec.id IS NULL THEN
    RETURN QUERY SELECT 'NOT_FOUND'::TEXT, NULL::UUID, 0, NULL::TEXT;
    RETURN;
  END IF;

  IF rec.verified_at IS NOT NULL THEN
    RETURN QUERY SELECT 'ALREADY_USED'::TEXT, rec.id, 0, NULL::TEXT;
    RETURN;
  END IF;

  IF rec.expires_at <= now() THEN
    RETURN QUERY SELECT 'EXPIRED'::TEXT, rec.id, 0, NULL::TEXT;
    RETURN;
  END IF;

  IF rec.attempt_count >= rec.max_attempts THEN
    RETURN QUERY SELECT 'MAX_ATTEMPTS_EXCEEDED'::TEXT, rec.id, 0, NULL::TEXT;
    RETURN;
  END IF;

  -- Count attempt FIRST to prevent race-condition bypasses (H5)
  new_attempt_count := rec.attempt_count + 1;
  UPDATE public.organizer_verification_challenges
  SET attempt_count = new_attempt_count
  WHERE id = rec.id;

  IF rec.otp_hash = p_otp_hash THEN
    UPDATE public.organizer_verification_challenges
    SET verified_at = now()
    WHERE id = rec.id;

    RETURN QUERY SELECT 'SUCCESS'::TEXT, rec.id, (rec.max_attempts - new_attempt_count), rec.pending_payload;
    RETURN;
  ELSE
    IF new_attempt_count >= rec.max_attempts THEN
      RETURN QUERY SELECT 'MAX_ATTEMPTS_EXCEEDED'::TEXT, rec.id, 0, NULL::TEXT;
      RETURN;
    ELSE
      RETURN QUERY SELECT 'INVALID_OTP'::TEXT, rec.id, (rec.max_attempts - new_attempt_count), NULL::TEXT;
      RETURN;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_organizer_verification_challenge(
  TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_organizer_verification_challenge(
  TEXT, TEXT, TEXT
) TO service_role;


-- ------------------------------------------------------------------------------
-- 2. H3, M10, Functional Bug 3: Invitation Hierarchy & Secure Redemption
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_invitation_role_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_role_id UUID;
  inviter_role_name TEXT;
  target_role_name TEXT;
BEGIN
  SELECT id INTO owner_role_id FROM public.roles WHERE name = 'workspace_owner';
  IF NEW.role_id = owner_role_id THEN
    RAISE EXCEPTION 'Invitations cannot grant workspace_owner role';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT r.name INTO inviter_role_name
    FROM public.workspace_members wm
    JOIN public.roles r ON wm.role_id = r.id
    WHERE wm.workspace_id = NEW.workspace_id AND wm.user_id = auth.uid();

    SELECT name INTO target_role_name FROM public.roles WHERE id = NEW.role_id;

    IF inviter_role_name IS NULL THEN
      RAISE EXCEPTION 'Inviter is not a member of this workspace';
    END IF;

    IF inviter_role_name = 'admin' AND target_role_name IN ('workspace_owner', 'admin') THEN
      RAISE EXCEPTION 'Admins cannot grant roles equal to or higher than their own';
    END IF;

    IF inviter_role_name NOT IN ('workspace_owner', 'admin') THEN
      RAISE EXCEPTION 'Only workspace owners and admins may invite team members';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_invitation_role_hierarchy ON public.workspace_invitations;
CREATE TRIGGER trg_check_invitation_role_hierarchy
  BEFORE INSERT OR UPDATE ON public.workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_invitation_role_hierarchy();

CREATE OR REPLACE FUNCTION public.redeem_invitation(
    p_token UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_uid UUID;
    v_user_email TEXT;
    v_user_confirmed_at TIMESTAMPTZ;
    v_invitation RECORD;
    v_event_id UUID;
    v_owner_role_id UUID;
BEGIN
    -- 1. Identify User
    v_user_uid := auth.uid();
    IF v_user_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be logged in to redeem an invitation.');
    END IF;

    SELECT email, email_confirmed_at INTO v_user_email, v_user_confirmed_at
    FROM auth.users WHERE id = v_user_uid;

    IF v_user_email IS NULL OR v_user_confirmed_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please confirm your email address before redeeming this invitation.');
    END IF;

    -- 2. Validate Invitation under Lock
    SELECT * INTO v_invitation FROM public.workspace_invitations WHERE token = p_token FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'This invitation is invalid or has expired.');
    END IF;

    IF v_invitation.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This invitation is no longer active.');
    END IF;

    IF v_invitation.expires_at < now() THEN
        UPDATE public.workspace_invitations SET status = 'expired' WHERE id = v_invitation.id;
        RETURN jsonb_build_object('success', false, 'message', 'This invitation has expired.');
    END IF;

    -- Strict email matching with generic error (M10)
    IF lower(btrim(v_invitation.email)) != lower(btrim(v_user_email)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This invitation is invalid or was intended for a different account.');
    END IF;

    -- Privilege escalation prevention: never grant workspace_owner (H3)
    SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'workspace_owner';
    IF v_invitation.role_id = v_owner_role_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'This invitation is invalid.');
    END IF;

    -- 3. Create or Confirm Workspace Membership
    INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
    VALUES (v_invitation.workspace_id, v_user_uid, v_invitation.role_id)
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

    -- 4. Mark Invitation Accepted
    UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = v_invitation.id;

    v_event_id := NULL;
    IF v_invitation.metadata ? 'event_id' AND v_invitation.metadata->>'event_id' IS NOT NULL THEN
      v_event_id := (v_invitation.metadata->>'event_id')::UUID;
    END IF;

    RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'message', 'Invitation redeemed successfully.');
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. Functional Bugs 1 & 2: Correct RLS Permissions on event_integrations
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable read for event organizers" ON public.event_integrations;
DROP POLICY IF EXISTS "Enable insert for event organizers" ON public.event_integrations;
DROP POLICY IF EXISTS "Enable update for event organizers" ON public.event_integrations;

CREATE POLICY "Enable read for event organizers" ON public.event_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND (public.has_permission(e.workspace_id, 'events.read') OR public.has_permission(e.workspace_id, 'events.update'))
    )
  );

CREATE POLICY "Enable insert for event organizers" ON public.event_integrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND public.has_permission(e.workspace_id, 'events.update')
    )
  );

CREATE POLICY "Enable update for event organizers" ON public.event_integrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND public.has_permission(e.workspace_id, 'events.update')
    )
  );


-- ------------------------------------------------------------------------------
-- 4. M8: Restrict Walkathon Medical Data to Authorized Managers
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable read for organizers" ON public.walkathon_participants;
DROP POLICY IF EXISTS "Enable insert for organizers" ON public.walkathon_participants;
DROP POLICY IF EXISTS "Enable update for organizers" ON public.walkathon_participants;

CREATE POLICY "Enable read for organizers" ON public.walkathon_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.id = walkathon_participants.registration_id
      AND public.is_workspace_member(e.workspace_id)
      AND (
        public.has_permission(e.workspace_id, 'registrations.manage') OR
        public.has_permission(e.workspace_id, 'events.update')
      )
    )
  );

CREATE POLICY "Enable insert for organizers" ON public.walkathon_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.id = walkathon_participants.registration_id
      AND public.is_workspace_member(e.workspace_id)
      AND (
        public.has_permission(e.workspace_id, 'registrations.manage') OR
        public.has_permission(e.workspace_id, 'events.update')
      )
    )
  );

CREATE POLICY "Enable update for organizers" ON public.walkathon_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.id = walkathon_participants.registration_id
      AND public.is_workspace_member(e.workspace_id)
      AND (
        public.has_permission(e.workspace_id, 'registrations.manage') OR
        public.has_permission(e.workspace_id, 'events.update')
      )
    )
  );


-- ------------------------------------------------------------------------------
-- 5. M9, L15: QR Ticket RLS & Composite Event Consistency Constraint
-- ------------------------------------------------------------------------------

-- Ensure unique (id, event_id) on registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_registrations_id_event'
  ) THEN
    ALTER TABLE public.registrations ADD CONSTRAINT uq_registrations_id_event UNIQUE (id, event_id);
  END IF;
END $$;

-- Enforce composite foreign key on qr_credentials to eliminate cross-event credential binding (L15)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_qr_credentials_reg_event'
  ) THEN
    ALTER TABLE public.qr_credentials
      ADD CONSTRAINT fk_qr_credentials_reg_event
      FOREIGN KEY (registration_id, event_id)
      REFERENCES public.registrations(id, event_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Restrict qr_credentials client modification (M9)
DROP POLICY IF EXISTS "Enable insert for event managers (QR)" ON public.qr_credentials;
DROP POLICY IF EXISTS "Enable update for event managers (QR)" ON public.qr_credentials;

REVOKE INSERT, UPDATE, DELETE ON public.qr_credentials FROM anon, authenticated;
GRANT ALL ON public.qr_credentials TO service_role;


-- ------------------------------------------------------------------------------
-- 6. M11: Server-Side Plan Limit Enforcement
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_workspace_event_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT := 'free';
  v_status TEXT := 'active';
  v_overrides JSONB := '{}'::jsonb;
  v_limit INT := 2;
  v_current_count INT;
BEGIN
  -- Only count active events (ignore archived / cancelled)
  IF NEW.status IN ('archived', 'cancelled') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('plan_events:' || NEW.workspace_id::text, 0)
  );

  SELECT plan_id, status, entitlement_overrides
  INTO v_plan_id, v_status, v_overrides
  FROM public.workspace_subscriptions
  WHERE workspace_id = NEW.workspace_id;

  IF v_status NOT IN ('active', 'trialing') THEN
    v_plan_id := 'free';
  END IF;

  IF v_plan_id = 'enterprise' THEN
    IF v_overrides ? 'maxActiveEvents' AND v_overrides->>'maxActiveEvents' IS NOT NULL THEN
      v_limit := (v_overrides->>'maxActiveEvents')::INT;
    ELSE
      v_limit := 50;
    END IF;
  ELSIF v_plan_id = 'professional' THEN
    v_limit := 10;
  ELSE
    v_limit := 2;
  END IF;

  SELECT count(*) INTO v_current_count
  FROM public.events
  WHERE workspace_id = NEW.workspace_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status NOT IN ('archived', 'cancelled');

  IF v_limit IS NOT NULL AND v_current_count >= v_limit THEN
    RAISE EXCEPTION 'Active event limit for your current plan (% events) has been reached. Please upgrade to create more events.', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_workspace_event_limit ON public.events;
CREATE TRIGGER trg_enforce_workspace_event_limit
  BEFORE INSERT OR UPDATE OF status ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workspace_event_limit();

CREATE OR REPLACE FUNCTION public.enforce_workspace_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT := 'free';
  v_status TEXT := 'active';
  v_overrides JSONB := '{}'::jsonb;
  v_limit INT := 3;
  v_current_count INT;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('plan_members:' || NEW.workspace_id::text, 0)
  );

  SELECT plan_id, status, entitlement_overrides
  INTO v_plan_id, v_status, v_overrides
  FROM public.workspace_subscriptions
  WHERE workspace_id = NEW.workspace_id;

  IF v_status NOT IN ('active', 'trialing') THEN
    v_plan_id := 'free';
  END IF;

  IF v_plan_id = 'enterprise' THEN
    IF v_overrides ? 'maxTeamMembers' AND v_overrides->>'maxTeamMembers' IS NOT NULL THEN
      v_limit := (v_overrides->>'maxTeamMembers')::INT;
    ELSE
      v_limit := NULL; -- unlimited
    END IF;
  ELSIF v_plan_id = 'professional' THEN
    v_limit := 15;
  ELSE
    v_limit := 3;
  END IF;

  IF v_limit IS NOT NULL THEN
    SELECT count(*) INTO v_current_count
    FROM public.workspace_members
    WHERE workspace_id = NEW.workspace_id
      AND user_id != NEW.user_id;

    IF v_current_count >= v_limit THEN
      RAISE EXCEPTION 'Team member limit for your current plan (% members) has been reached. Please upgrade to invite more team members.', v_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_workspace_member_limit ON public.workspace_members;
CREATE TRIGGER trg_enforce_workspace_member_limit
  BEFORE INSERT ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workspace_member_limit();


-- ------------------------------------------------------------------------------
-- 7. M4, M15: Registration Hardening (Paid Tickets & Published Status)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_event_registration(
  p_event_id UUID,
  p_person_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_event RECORD;
  v_settings RECORD;
  v_active_count INTEGER;
  v_email TEXT;
  v_person_id UUID;
  v_event_person_id UUID;
  v_registration_id UUID;
  v_registration_number TEXT;
  v_distance_category_id UUID;
  v_distance_category RECORD;
  v_distance_active_count INTEGER;
  v_metadata JSONB;
  
  -- Ticket fields
  v_ticket_type_id UUID;
  v_ticket RECORD;
  v_ticket_sold_count INTEGER;
  v_quantity_requested INTEGER;
  v_has_active_tickets BOOLEAN;
  v_now TIMESTAMPTZ := now();
  
  v_integration RECORD;
  v_idempotency_key TEXT;
  v_payload JSONB;
BEGIN
  -- 1. Lock Event Row (Only published events permit registration) (M4)
  SELECT id, workspace_id, type, status INTO v_event 
  FROM public.events 
  WHERE id = p_event_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.status != 'published' THEN
    RAISE EXCEPTION 'Event is not published or open for registration';
  END IF;

  v_workspace_id := v_event.workspace_id;

  -- 2. Lock Registration Settings Row & Validate Event Capacity
  SELECT * INTO v_settings 
  FROM public.event_registration_settings 
  WHERE event_id = p_event_id 
  FOR UPDATE;

  IF NOT FOUND OR NOT v_settings.is_enabled THEN
    RAISE EXCEPTION 'Registration is not enabled for this event';
  END IF;

  IF v_settings.capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count 
    FROM public.registrations 
    WHERE event_id = p_event_id AND status IN ('pending', 'confirmed');

    IF v_active_count >= v_settings.capacity THEN
      RAISE EXCEPTION 'Event capacity reached';
    END IF;
  END IF;

  -- 3. Ticket Validation & Lock (M15)
  SELECT EXISTS (
    SELECT 1 FROM public.event_ticket_types
    WHERE event_id = p_event_id AND is_active = true
  ) INTO v_has_active_tickets;

  v_ticket_type_id := NULL;
  IF p_person_data ? 'ticket_type_id' AND p_person_data->>'ticket_type_id' IS NOT NULL AND p_person_data->>'ticket_type_id' != '' THEN
    v_ticket_type_id := (p_person_data->>'ticket_type_id')::UUID;
  END IF;

  IF v_has_active_tickets AND v_ticket_type_id IS NULL THEN
    RAISE EXCEPTION 'A valid ticket selection is required for this event';
  END IF;

  v_quantity_requested := COALESCE(NULLIF(p_person_data->>'quantity', '')::INTEGER, 1);
  IF v_quantity_requested < 1 THEN
    v_quantity_requested := 1;
  END IF;

  IF v_ticket_type_id IS NOT NULL THEN
    SELECT * INTO v_ticket 
    FROM public.event_ticket_types 
    WHERE id = v_ticket_type_id 
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected ticket type not found';
    END IF;

    IF v_ticket.event_id != p_event_id THEN
      RAISE EXCEPTION 'Selected ticket does not belong to this event';
    END IF;

    IF NOT v_ticket.is_active THEN
      RAISE EXCEPTION 'This ticket type is currently inactive';
    END IF;

    IF v_ticket.visibility != 'public' THEN
      RAISE EXCEPTION 'This ticket is not publicly available';
    END IF;

    IF v_ticket.sales_start_at IS NOT NULL AND v_now < v_ticket.sales_start_at THEN
      RAISE EXCEPTION 'Ticket sales have not started yet';
    END IF;

    IF v_ticket.sales_end_at IS NOT NULL AND v_now > v_ticket.sales_end_at THEN
      RAISE EXCEPTION 'Ticket sales have ended';
    END IF;

    IF v_quantity_requested < v_ticket.min_per_order THEN
      RAISE EXCEPTION 'Minimum ticket quantity per order is %', v_ticket.min_per_order;
    END IF;

    IF v_quantity_requested > v_ticket.max_per_order THEN
      RAISE EXCEPTION 'Maximum ticket quantity per order is %', v_ticket.max_per_order;
    END IF;

    SELECT COUNT(*) INTO v_ticket_sold_count
    FROM public.registrations
    WHERE ticket_type_id = v_ticket_type_id AND status IN ('pending', 'confirmed');

    IF v_ticket_sold_count + v_quantity_requested > v_ticket.quantity_total THEN
      RAISE EXCEPTION 'This ticket type is sold out or does not have sufficient remaining inventory';
    END IF;

    -- Never confirm paid tickets without payment integration (M15)
    IF v_ticket.ticket_type = 'paid' THEN
      RAISE EXCEPTION 'Payment gateway is not configured for this event. Paid ticket registrations cannot be accepted at this time.';
    END IF;
  END IF;

  -- 4. Walkathon Validation
  v_distance_category_id := NULL;
  IF p_person_data ? 'distance_category_id' AND p_person_data->>'distance_category_id' IS NOT NULL AND p_person_data->>'distance_category_id' != '' THEN
    v_distance_category_id := (p_person_data->>'distance_category_id')::UUID;
  END IF;
  
  IF v_event.type = 'Walkathon' THEN
    IF v_distance_category_id IS NULL THEN
        RAISE EXCEPTION 'Distance category is required for Walkathon registrations';
    END IF;

    SELECT * INTO v_distance_category 
    FROM public.walkathon_distance_categories 
    WHERE id = v_distance_category_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Distance category not found';
    END IF;

    IF v_distance_category.event_id != p_event_id THEN
        RAISE EXCEPTION 'Distance category belongs to a different event';
    END IF;

    IF NOT v_distance_category.is_active THEN
        RAISE EXCEPTION 'This distance category is currently closed';
    END IF;

    IF v_distance_category.capacity IS NOT NULL THEN
        SELECT COUNT(*) INTO v_distance_active_count 
        FROM public.registrations 
        WHERE distance_category_id = v_distance_category_id AND status IN ('pending', 'confirmed');

        IF v_distance_active_count >= v_distance_category.capacity THEN
            RAISE EXCEPTION 'Capacity reached for this distance category';
        END IF;
    END IF;
  ELSIF v_distance_category_id IS NOT NULL THEN
    RAISE EXCEPTION 'Distance category can only be provided for Walkathon events';
  END IF;

  -- 5. Normalize Email
  v_email := lower(btrim(p_person_data->>'email'));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- 6. Find or Create Person Identity
  SELECT id INTO v_person_id 
  FROM public.people 
  WHERE workspace_id = v_workspace_id AND email = v_email;

  IF NOT FOUND THEN
    INSERT INTO public.people (
      workspace_id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      organization, 
      job_title
    ) VALUES (
      v_workspace_id,
      p_person_data->>'first_name',
      p_person_data->>'last_name',
      v_email,
      p_person_data->>'phone',
      p_person_data->>'organization',
      p_person_data->>'job_title'
    ) RETURNING id INTO v_person_id;
  END IF;

  -- 7. Find or Create event_people relationship
  SELECT id INTO v_event_person_id 
  FROM public.event_people 
  WHERE event_id = p_event_id AND person_id = v_person_id AND person_type = 'attendee';

  IF NOT FOUND THEN
    INSERT INTO public.event_people (
      event_id,
      person_id,
      person_type,
      status
    ) VALUES (
      p_event_id,
      v_person_id,
      'attendee',
      'active'
    ) RETURNING id INTO v_event_person_id;
  END IF;

  -- 8. Duplicate Active Registration Check (return safe existing response without error) (M4)
  SELECT id, registration_number INTO v_registration_id, v_registration_number
  FROM public.registrations 
  WHERE event_id = p_event_id AND person_id = v_person_id AND status IN ('pending', 'confirmed')
  LIMIT 1;

  IF v_registration_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'registration_id', v_registration_id,
      'registration_number', v_registration_number,
      'message', 'Registration confirmed'
    );
  END IF;

  -- 9. Generate Sequential Registration Number
  v_registration_number := public.generate_registration_number(p_event_id);

  -- 10. Extract metadata
  v_metadata := jsonb_build_object(
    'gender', p_person_data->>'gender',
    'age', p_person_data->>'age',
    't_shirt_size', p_person_data->>'t_shirt_size',
    'emergency_contact_name', p_person_data->>'emergency_contact_name',
    'emergency_contact_phone', p_person_data->>'emergency_contact_phone'
  );

  -- 11. Create Registration Record
  INSERT INTO public.registrations (
    event_id,
    person_id,
    ticket_type_id,
    distance_category_id,
    registration_number,
    status,
    confirmation_status,
    registered_at,
    metadata
  ) VALUES (
    p_event_id,
    v_person_id,
    v_ticket_type_id,
    v_distance_category_id,
    v_registration_number,
    'confirmed',
    'confirmed',
    now(),
    v_metadata
  ) RETURNING id INTO v_registration_id;

  -- 12. Create walkathon_participants record if Walkathon
  IF v_event.type = 'Walkathon' THEN
    INSERT INTO public.walkathon_participants (
      registration_id,
      gender,
      age,
      t_shirt_size,
      emergency_contact_name,
      emergency_contact_phone,
      city,
      medical_notes
    ) VALUES (
      v_registration_id,
      p_person_data->>'gender',
      NULLIF(p_person_data->>'age', '')::INTEGER,
      p_person_data->>'t_shirt_size',
      p_person_data->>'emergency_contact_name',
      p_person_data->>'emergency_contact_phone',
      p_person_data->>'city',
      p_person_data->>'medical_notes'
    ) ON CONFLICT (registration_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'registration_number', v_registration_number
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 8. L5, L6: Secure Default Privileges & Revoke Public Helper Execution
-- ------------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_workspace_from_event(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_from_event(UUID) TO authenticated, service_role;
