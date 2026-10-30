-- ==============================================================================
-- Fix public registration: restore event_person_id and what else the
-- 20261020000000 rewrite of submit_event_registration dropped
-- ==============================================================================
-- That rewrite still finds or creates the attendee's event_people row, but left
-- it out of the INSERT, so every public registration failed with
--   null value in column "event_person_id" of relation "registrations"
--   violates not-null constraint
-- Compared with the previous version (20261012000000_tickets_and_pricing) it
-- also dropped confirmed_at, the ticket name/price/currency kept in metadata
-- (shown in the attendee CSV export) and the registration_confirmed jobs for
-- non-email integrations. This restores all four and keeps every check the
-- security rewrite added. Grants are unchanged (CREATE OR REPLACE keeps them).
-- Idempotent.
-- ==============================================================================

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
  v_metadata := jsonb_strip_nulls(jsonb_build_object(
    'gender', p_person_data->>'gender',
    'age', p_person_data->>'age',
    't_shirt_size', p_person_data->>'t_shirt_size',
    'emergency_contact_name', p_person_data->>'emergency_contact_name',
    'emergency_contact_phone', p_person_data->>'emergency_contact_phone'
  ));
  IF v_ticket_type_id IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object(
      'ticket_type_name', v_ticket.name,
      'ticket_price_amount', v_ticket.price_amount,
      'ticket_currency', v_ticket.currency
    );
  END IF;

  -- 11. Create Registration Record
  INSERT INTO public.registrations (
    event_id,
    person_id,
    event_person_id,
    ticket_type_id,
    distance_category_id,
    registration_number,
    status,
    confirmation_status,
    registered_at,
    confirmed_at,
    metadata
  ) VALUES (
    p_event_id,
    v_person_id,
    v_event_person_id,
    v_ticket_type_id,
    v_distance_category_id,
    v_registration_number,
    'confirmed',
    'confirmed',
    now(),
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

  -- 13. Queue jobs for active non-email integrations (email is queued by the app with the QR ticket)
  v_payload := jsonb_build_object(
    'registrationId', v_registration_id,
    'registrationNumber', v_registration_number,
    'attendee', jsonb_build_object(
      'firstName', p_person_data->>'first_name',
      'lastName', p_person_data->>'last_name',
      'email', v_email,
      'phone', p_person_data->>'phone'
    )
  );

  FOR v_integration IN
    SELECT provider FROM public.event_integrations
    WHERE event_id = p_event_id AND is_active = true AND provider != 'email'
  LOOP
    v_idempotency_key := p_event_id::text || ':' || v_registration_id::text || ':' || v_integration.provider || ':registration_confirmed';

    INSERT INTO public.integration_jobs (
      event_id, registration_id, provider, event_type, payload, idempotency_key, next_attempt_at
    ) VALUES (
      p_event_id, v_registration_id, v_integration.provider, 'registration_confirmed', v_payload, v_idempotency_key, now()
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'registration_number', v_registration_number
  );
END;
$$;
