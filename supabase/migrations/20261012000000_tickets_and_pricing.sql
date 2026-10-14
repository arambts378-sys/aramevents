-- 20261012000000_tickets_and_pricing.sql

-- 1. Create Permissions
INSERT INTO public.permissions (name) VALUES 
('tickets.view'),
('tickets.create'),
('tickets.update'),
('tickets.manage')
ON CONFLICT (name) DO NOTHING;

-- 2. Assign Permissions to Roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner' AND p.name IN ('tickets.view', 'tickets.create', 'tickets.update', 'tickets.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('tickets.view', 'tickets.create', 'tickets.update', 'tickets.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('tickets.view', 'tickets.create', 'tickets.update')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name IN ('tickets.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name IN ('tickets.view')
ON CONFLICT DO NOTHING;

-- 3. Create event_ticket_types Table
CREATE TABLE IF NOT EXISTS public.event_ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('free', 'paid')),
  price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  quantity_total INTEGER NOT NULL CHECK (quantity_total >= 1),
  sales_start_at TIMESTAMPTZ NULL,
  sales_end_at TIMESTAMPTZ NULL,
  min_per_order INTEGER NOT NULL DEFAULT 1 CHECK (min_per_order >= 1),
  max_per_order INTEGER NOT NULL DEFAULT 10 CHECK (max_per_order >= min_per_order),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_free_ticket_price CHECK ((ticket_type = 'free' AND price_amount = 0) OR (ticket_type = 'paid' AND price_amount > 0)),
  CONSTRAINT chk_sales_period CHECK (sales_start_at IS NULL OR sales_end_at IS NULL OR sales_end_at >= sales_start_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON public.event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_visibility ON public.event_ticket_types(visibility);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_is_active ON public.event_ticket_types(is_active);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_sales_period ON public.event_ticket_types(sales_start_at, sales_end_at);

-- 4. Extend registrations Table with ticket_type_id (RESTRICT to prevent invalidating sold tickets)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'registrations' 
    AND column_name = 'ticket_type_id'
  ) THEN
    ALTER TABLE public.registrations 
    ADD COLUMN ticket_type_id UUID NULL REFERENCES public.event_ticket_types(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_registrations_ticket_type_id ON public.registrations(ticket_type_id);

-- 5. Row Level Security for event_ticket_types
ALTER TABLE public.event_ticket_types ENABLE ROW LEVEL SECURITY;

-- Organizers read tickets
DROP POLICY IF EXISTS "Enable read tickets for organizers" ON public.event_ticket_types;
CREATE POLICY "Enable read tickets for organizers" ON public.event_ticket_types
  FOR SELECT USING (
    public.is_workspace_member(public.get_workspace_from_event(event_id))
  );

-- Organizers insert tickets
DROP POLICY IF EXISTS "Enable insert tickets for organizers" ON public.event_ticket_types;
CREATE POLICY "Enable insert tickets for organizers" ON public.event_ticket_types
  FOR INSERT WITH CHECK (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    (public.has_permission(public.get_workspace_from_event(event_id), 'tickets.create') OR
     public.has_permission(public.get_workspace_from_event(event_id), 'registrations.manage'))
  );

-- Organizers update tickets
DROP POLICY IF EXISTS "Enable update tickets for organizers" ON public.event_ticket_types;
CREATE POLICY "Enable update tickets for organizers" ON public.event_ticket_types
  FOR UPDATE USING (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    (public.has_permission(public.get_workspace_from_event(event_id), 'tickets.update') OR
     public.has_permission(public.get_workspace_from_event(event_id), 'registrations.manage'))
  );

-- Organizers delete tickets (for unused tickets without registrations)
DROP POLICY IF EXISTS "Enable delete tickets for organizers" ON public.event_ticket_types;
CREATE POLICY "Enable delete tickets for organizers" ON public.event_ticket_types
  FOR DELETE USING (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    (public.has_permission(public.get_workspace_from_event(event_id), 'tickets.manage') OR
     public.has_permission(public.get_workspace_from_event(event_id), 'registrations.manage'))
  );

-- Public read active public tickets for published events with registration enabled
DROP POLICY IF EXISTS "Enable read tickets for public" ON public.event_ticket_types;
CREATE POLICY "Enable read tickets for public" ON public.event_ticket_types
  FOR SELECT USING (
    is_active = true AND 
    visibility = 'public' AND
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.event_registration_settings s ON s.event_id = e.id
      WHERE e.id = event_ticket_types.event_id
      AND s.is_enabled = true
      AND (e.status = 'published' OR (e.website->>'status' = 'published'))
    )
  );

-- 6. Safe Public Ticket Availability RPC (Does NOT expose any attendee or private registration data)
CREATE OR REPLACE FUNCTION public.get_event_ticket_availability(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_rec RECORD;
  v_sold INTEGER;
  v_remaining INTEGER;
  v_status TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Verify event has registration enabled and is published
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.event_registration_settings s ON s.event_id = e.id
    WHERE e.id = p_event_id
    AND s.is_enabled = true
    AND (e.status = 'published' OR (e.website->>'status' = 'published'))
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR v_rec IN 
    SELECT 
      t.id,
      t.event_id,
      t.name,
      t.description,
      t.ticket_type,
      t.price_amount,
      t.currency,
      t.quantity_total,
      t.min_per_order,
      t.max_per_order,
      t.sales_start_at,
      t.sales_end_at
    FROM public.event_ticket_types t
    WHERE t.event_id = p_event_id
      AND t.is_active = true
      AND t.visibility = 'public'
    ORDER BY t.price_amount ASC, t.created_at ASC
  LOOP
    -- Calculate sold quantity securely
    SELECT COUNT(*) INTO v_sold
    FROM public.registrations r
    WHERE r.ticket_type_id = v_rec.id 
      AND r.status IN ('pending', 'confirmed');

    v_remaining := GREATEST(0, v_rec.quantity_total - v_sold);

    -- Calculate derived sales status
    IF v_rec.sales_start_at IS NOT NULL AND v_now < v_rec.sales_start_at THEN
      v_status := 'scheduled';
    ELSIF v_rec.sales_end_at IS NOT NULL AND v_now > v_rec.sales_end_at THEN
      v_status := 'sales_ended';
    ELSIF v_remaining <= 0 THEN
      v_status := 'sold_out';
    ELSE
      v_status := 'on_sale';
    END IF;

    v_result := v_result || jsonb_build_object(
      'id', v_rec.id,
      'event_id', v_rec.event_id,
      'name', v_rec.name,
      'description', v_rec.description,
      'ticket_type', v_rec.ticket_type,
      'price_amount', v_rec.price_amount,
      'currency', v_rec.currency,
      'quantity_total', v_rec.quantity_total,
      'quantity_sold', v_sold,
      'quantity_remaining', v_remaining,
      'min_per_order', v_rec.min_per_order,
      'max_per_order', v_rec.max_per_order,
      'sales_start_at', v_rec.sales_start_at,
      'sales_end_at', v_rec.sales_end_at,
      'status', v_status
    );
  END LOOP;

  RETURN v_result;
END;
$$;

-- 7. Update submit_event_registration with strict lock ordering:
-- Order: events (FOR UPDATE) -> event_registration_settings (FOR UPDATE) -> event_ticket_types (FOR UPDATE) -> registrations
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
  v_now TIMESTAMPTZ := now();
  
  v_integration RECORD;
  v_idempotency_key TEXT;
  v_payload JSONB;
BEGIN
  -- 1. Lock Event Row (Lock Order Step 1: events)
  SELECT id, workspace_id, type INTO v_event 
  FROM public.events 
  WHERE id = p_event_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  v_workspace_id := v_event.workspace_id;

  -- 2. Lock Registration Settings Row & Validate Event Capacity (Lock Order Step 2: event_registration_settings)
  SELECT * INTO v_settings 
  FROM public.event_registration_settings 
  WHERE event_id = p_event_id 
  FOR UPDATE;

  IF NOT FOUND OR NOT v_settings.is_enabled THEN
    RAISE EXCEPTION 'Registration is not enabled for this event';
  END IF;

  -- Enforce Global Event Capacity (concurrency-safe under FOR UPDATE locks)
  IF v_settings.capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count 
    FROM public.registrations 
    WHERE event_id = p_event_id AND status IN ('pending', 'confirmed');

    IF v_active_count >= v_settings.capacity THEN
      RAISE EXCEPTION 'Event capacity reached';
    END IF;
  END IF;

  -- 3. Ticket Validation & Lock (Lock Order Step 3: event_ticket_types)
  v_ticket_type_id := NULL;
  IF p_person_data ? 'ticket_type_id' AND p_person_data->>'ticket_type_id' IS NOT NULL AND p_person_data->>'ticket_type_id' != '' THEN
    v_ticket_type_id := (p_person_data->>'ticket_type_id')::UUID;
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

    -- Validate Sales Period
    IF v_ticket.sales_start_at IS NOT NULL AND v_now < v_ticket.sales_start_at THEN
      RAISE EXCEPTION 'Ticket sales have not started yet';
    END IF;

    IF v_ticket.sales_end_at IS NOT NULL AND v_now > v_ticket.sales_end_at THEN
      RAISE EXCEPTION 'Ticket sales have ended';
    END IF;

    -- Validate Purchase Limits
    IF v_quantity_requested < v_ticket.min_per_order THEN
      RAISE EXCEPTION 'Minimum ticket quantity per order is %', v_ticket.min_per_order;
    END IF;

    IF v_quantity_requested > v_ticket.max_per_order THEN
      RAISE EXCEPTION 'Maximum ticket quantity per order is %', v_ticket.max_per_order;
    END IF;

    -- Validate Ticket Inventory under lock
    SELECT COUNT(*) INTO v_ticket_sold_count
    FROM public.registrations
    WHERE ticket_type_id = v_ticket_type_id AND status IN ('pending', 'confirmed');

    IF v_ticket_sold_count + v_quantity_requested > v_ticket.quantity_total THEN
      RAISE EXCEPTION 'This ticket type is sold out or does not have sufficient remaining inventory';
    END IF;

    -- Payment Gateway Safety Check: Block Paid Tickets
    IF v_ticket.ticket_type = 'paid' THEN
      RAISE EXCEPTION 'Payment gateway is not configured for this event. Paid ticket registrations cannot be accepted at this time.';
    END IF;
  END IF;

  -- 4. Walkathon Specific Validation & Locking
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
  v_email := lower(trim(p_person_data->>'email'));
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

  -- 8. Check Duplicate Active Registration
  IF EXISTS (
    SELECT 1 FROM public.registrations 
    WHERE event_id = p_event_id AND person_id = v_person_id AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'An active registration already exists for this event.';
  END IF;

  -- 9. Generate Unique Registration Number
  v_registration_number := 'ARAM-REG-' || upper(substring(md5(random()::text), 1, 8));

  -- 10. Extract unhandled fields to Metadata
  v_metadata := '{}'::jsonb;
  IF v_ticket_type_id IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object(
      'ticket_type_name', v_ticket.name,
      'ticket_price_amount', v_ticket.price_amount,
      'ticket_currency', v_ticket.currency
    );
  END IF;

  -- 11. Create Registration Record (Lock Order Step 4: registrations)
  INSERT INTO public.registrations (
    event_id,
    person_id,
    event_person_id,
    registration_number,
    status,
    confirmation_status,
    confirmed_at,
    distance_category_id,
    ticket_type_id,
    metadata
  ) VALUES (
    p_event_id,
    v_person_id,
    v_event_person_id,
    v_registration_number,
    'confirmed',
    'confirmed',
    now(),
    v_distance_category_id,
    v_ticket_type_id,
    v_metadata
  ) RETURNING id INTO v_registration_id;

  -- 12. Create walkathon_participants record if Walkathon
  IF v_event.type = 'Walkathon' THEN
    INSERT INTO public.walkathon_participants (
      registration_id,
      gender,
      date_of_birth,
      age,
      t_shirt_size,
      emergency_contact_name,
      emergency_contact_phone,
      city,
      medical_notes
    ) VALUES (
      v_registration_id,
      p_person_data->>'gender',
      (p_person_data->>'date_of_birth')::DATE,
      (p_person_data->>'age')::INTEGER,
      p_person_data->>'t_shirt_size',
      p_person_data->>'emergency_contact_name',
      p_person_data->>'emergency_contact_phone',
      p_person_data->>'city',
      p_person_data->>'medical_notes'
    );
  END IF;

  -- 13. Create general integration jobs (skip email, handled by QR delivery enqueue)
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
    WHERE event_id = p_event_id AND is_active = true
  LOOP
    IF v_integration.provider = 'email' THEN
      CONTINUE;
    END IF;

    v_idempotency_key := p_event_id::text || ':' || v_registration_id::text || ':' || v_integration.provider || ':registration_confirmed';
    
    INSERT INTO public.integration_jobs (
      event_id,
      registration_id,
      provider,
      event_type,
      payload,
      idempotency_key,
      next_attempt_at
    ) VALUES (
      p_event_id,
      v_registration_id,
      v_integration.provider,
      'registration_confirmed',
      v_payload,
      v_idempotency_key,
      now()
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  -- Return Result
  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'registration_number', v_registration_number
  );
END;
$$;
