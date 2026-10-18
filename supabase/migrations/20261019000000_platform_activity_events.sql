-- Operational diagnostics are separate from the platform audit log, which remains
-- reserved for privileged administrative actions.
CREATE TABLE public.platform_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  actor_user_id UUID,
  category TEXT NOT NULL CHECK (category IN (
    'platform', 'auth', 'event', 'website', 'registration', 'ticket', 'check_in', 'integration'
  )),
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 160),
  resource_type TEXT CHECK (resource_type IS NULL OR length(resource_type) <= 80),
  resource_id TEXT CHECK (resource_id IS NULL OR length(resource_id) <= 200),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'warning')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  error_code TEXT CHECK (error_code IS NULL OR error_code ~ '^[A-Z0-9_]{1,80}$'),
  message TEXT NOT NULL CHECK (length(message) <= 500),
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object' AND pg_column_size(metadata) <= 4096)
);

CREATE INDEX platform_activity_occurred_idx
  ON public.platform_activity_events (occurred_at DESC, id DESC);
CREATE INDEX platform_activity_workspace_occurred_idx
  ON public.platform_activity_events (workspace_id, occurred_at DESC);
CREATE INDEX platform_activity_category_occurred_idx
  ON public.platform_activity_events (category, occurred_at DESC);
CREATE INDEX platform_activity_action_occurred_idx
  ON public.platform_activity_events (action, occurred_at DESC);
CREATE INDEX platform_activity_outcome_severity_idx
  ON public.platform_activity_events (outcome, severity, occurred_at DESC);
CREATE INDEX platform_activity_correlation_idx
  ON public.platform_activity_events (correlation_id);

ALTER TABLE public.platform_activity_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_activity_events FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON public.platform_activity_events TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_platform_activity_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'Platform activity events are append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_platform_activity_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER platform_activity_events_append_only
  BEFORE UPDATE OR DELETE ON public.platform_activity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_platform_activity_mutation();

CREATE OR REPLACE FUNCTION public.capture_platform_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_event_id UUID;
  v_workspace_id UUID;
  v_actor_id UUID;
  v_category TEXT;
  v_action TEXT;
  v_resource_type TEXT;
  v_resource_id TEXT;
  v_outcome TEXT := 'success';
  v_severity TEXT := 'info';
  v_error_code TEXT;
  v_message TEXT;
  v_metadata JSONB := '{}'::jsonb;
  v_correlation_id UUID;
  v_headers TEXT;
BEGIN
  IF TG_TABLE_NAME = 'events' THEN
    v_event_id := NEW.id;
    v_workspace_id := NEW.workspace_id;
    v_actor_id := auth.uid();
    v_resource_type := 'event';
    v_resource_id := NEW.id::text;

    IF TG_OP = 'INSERT' THEN
      v_category := 'event';
      v_action := 'event.created';
      v_message := 'Event created.';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'published' THEN
      v_category := 'event';
      v_action := 'event.published';
      v_message := 'Event published.';
    ELSIF OLD.website IS DISTINCT FROM NEW.website THEN
      IF NEW.website->>'status' = 'published'
         AND COALESCE(OLD.website->>'status', '') IS DISTINCT FROM 'published' THEN
        v_category := 'website';
        v_action := 'website.published';
        v_message := 'Event website published.';
      ELSE
        v_category := 'website';
        v_action := 'website.saved';
        v_message := 'Event website saved.';
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'registrations' AND TG_OP = 'INSERT' THEN
    v_event_id := NEW.event_id;
    SELECT e.workspace_id INTO v_workspace_id FROM public.events e WHERE e.id = NEW.event_id;
    v_actor_id := auth.uid();
    v_category := 'registration';
    v_action := 'registration.created';
    v_resource_type := 'registration';
    v_resource_id := NEW.id::text;
    v_message := 'Registration created.';
  ELSIF TG_TABLE_NAME = 'qr_credentials' AND TG_OP = 'INSERT' THEN
    v_event_id := NEW.event_id;
    SELECT e.workspace_id INTO v_workspace_id FROM public.events e WHERE e.id = NEW.event_id;
    v_actor_id := auth.uid();
    v_category := 'ticket';
    v_action := 'ticket.generated';
    v_resource_type := 'qr_credential';
    v_resource_id := NEW.id::text;
    v_message := 'Ticket credential generated.';
  ELSIF TG_TABLE_NAME = 'check_ins' AND TG_OP = 'INSERT' THEN
    v_event_id := NEW.event_id;
    SELECT e.workspace_id INTO v_workspace_id FROM public.events e WHERE e.id = NEW.event_id;
    v_actor_id := NEW.scanned_by;
    v_category := 'check_in';
    v_resource_type := 'check_in';
    v_resource_id := NEW.id::text;
    IF NEW.result = 'allowed' THEN
      v_action := 'check_in.allowed';
      v_message := 'Check-in allowed.';
    ELSE
      v_action := 'check_in.denied';
      v_outcome := 'failure';
      v_severity := 'warning';
      v_error_code := CASE lower(COALESCE(NEW.reason, ''))
        WHEN 'unauthorized' THEN 'CHECK_IN_UNAUTHORIZED'
        WHEN 'invalid_token' THEN 'CHECK_IN_INVALID_TOKEN'
        WHEN 'zone_not_found' THEN 'CHECK_IN_ZONE_NOT_FOUND'
        WHEN 'registration_not_found' THEN 'CHECK_IN_REGISTRATION_NOT_FOUND'
        WHEN 'already_checked_in' THEN 'CHECK_IN_DUPLICATE'
        ELSE 'CHECK_IN_DENIED'
      END;
      v_message := 'Check-in denied.';
    END IF;
  ELSIF TG_TABLE_NAME = 'integration_jobs' AND TG_OP = 'UPDATE'
        AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('success', 'failed') THEN
    v_event_id := NEW.event_id;
    SELECT e.workspace_id INTO v_workspace_id FROM public.events e WHERE e.id = NEW.event_id;
    v_actor_id := auth.uid();
    v_category := 'integration';
    v_resource_type := 'integration_job';
    v_resource_id := NEW.id::text;
    v_metadata := jsonb_build_object(
      'provider', CASE WHEN NEW.provider IN ('email', 'google_sheets', 'whatsapp', 'qr', 'crm', 'webhook')
        THEN NEW.provider ELSE 'other' END,
      'eventType', CASE WHEN NEW.event_type IN ('qr_delivery', 'certificate_delivery', 'registration_confirmed', 'qr_generation')
        THEN NEW.event_type ELSE 'other' END
    );
    IF NEW.status = 'success' THEN
      v_action := 'integration.delivery_succeeded';
      v_message := 'Integration job completed.';
    ELSE
      v_action := 'integration.delivery_failed';
      v_outcome := 'failure';
      v_severity := 'error';
      v_error_code := CASE WHEN NEW.provider = 'email' THEN 'EMAIL_DELIVERY_FAILED' ELSE 'INTEGRATION_DELIVERY_FAILED' END;
      v_message := CASE WHEN NEW.provider = 'email' THEN 'Email delivery failed.' ELSE 'Integration delivery failed.' END;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NOT NULL THEN
      v_correlation_id := (v_headers::jsonb ->> 'x-request-id')::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_correlation_id := NULL;
  END;

  INSERT INTO public.platform_activity_events (
    workspace_id, actor_user_id, category, action, resource_type, resource_id,
    outcome, severity, error_code, message, correlation_id, metadata
  )
  VALUES (
    v_workspace_id, v_actor_id, v_category, v_action, v_resource_type, v_resource_id,
    v_outcome, v_severity, v_error_code, v_message, COALESCE(v_correlation_id, gen_random_uuid()), v_metadata
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Platform activity capture failed';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_platform_activity() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER events_platform_activity
  AFTER INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
CREATE TRIGGER registrations_platform_activity
  AFTER INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
CREATE TRIGGER qr_credentials_platform_activity
  AFTER INSERT ON public.qr_credentials
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
CREATE TRIGGER check_ins_platform_activity
  AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
CREATE TRIGGER integration_jobs_platform_activity
  AFTER UPDATE ON public.integration_jobs
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();

CREATE OR REPLACE FUNCTION public.list_platform_activity(
  p_workspace_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_outcome TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_correlation_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
DECLARE
  v_page INT := LEAST(GREATEST(COALESCE(p_page, 1), 1), 10000);
  v_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_search TEXT := NULLIF(btrim(p_search), '');
  v_result JSONB;
BEGIN
  IF NOT public.has_platform_permission('activity.read') THEN
    RAISE EXCEPTION 'Platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_category IS NOT NULL AND p_category NOT IN (
    'platform', 'auth', 'event', 'website', 'registration', 'ticket', 'check_in', 'integration'
  ) THEN
    RAISE EXCEPTION 'Invalid activity category' USING ERRCODE = '22023';
  END IF;
  IF p_outcome IS NOT NULL AND p_outcome NOT IN ('success', 'failure', 'warning') THEN
    RAISE EXCEPTION 'Invalid activity outcome' USING ERRCODE = '22023';
  END IF;
  IF p_severity IS NOT NULL AND p_severity NOT IN ('info', 'warning', 'error') THEN
    RAISE EXCEPTION 'Invalid activity severity' USING ERRCODE = '22023';
  END IF;
  IF p_action IS NOT NULL AND length(p_action) > 160 THEN
    RAISE EXCEPTION 'Invalid activity action' USING ERRCODE = '22023';
  END IF;
  IF v_search IS NOT NULL AND length(v_search) > 100 THEN
    RAISE EXCEPTION 'Activity search is too long' USING ERRCODE = '22023';
  END IF;
  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from > p_to THEN
    RAISE EXCEPTION 'Invalid activity date range' USING ERRCODE = '22023';
  END IF;

  WITH filtered AS (
    SELECT a.*
    FROM public.platform_activity_events a
    WHERE (p_workspace_id IS NULL OR a.workspace_id = p_workspace_id)
      AND (p_category IS NULL OR a.category = p_category)
      AND (p_action IS NULL OR a.action = p_action)
      AND (p_outcome IS NULL OR a.outcome = p_outcome)
      AND (p_severity IS NULL OR a.severity = p_severity)
      AND (p_from IS NULL OR a.occurred_at >= p_from)
      AND (p_to IS NULL OR a.occurred_at <= p_to)
      AND (p_correlation_id IS NULL OR a.correlation_id = p_correlation_id)
      AND (
        v_search IS NULL
        OR a.action ILIKE '%' || v_search || '%'
        OR COALESCE(a.error_code, '') ILIKE '%' || v_search || '%'
        OR a.message ILIKE '%' || v_search || '%'
      )
  ),
  page_rows AS (
    SELECT * FROM filtered
    ORDER BY occurred_at DESC, id DESC
    LIMIT v_page_size OFFSET (v_page - 1) * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'occurredAt', occurred_at,
        'workspaceId', workspace_id,
        'actorUserId', actor_user_id,
        'category', category,
        'action', action,
        'resourceType', resource_type,
        'resourceId', resource_id,
        'outcome', outcome,
        'severity', severity,
        'errorCode', error_code,
        'message', message,
        'correlationId', correlation_id,
        'metadata', metadata
      ) ORDER BY occurred_at DESC, id DESC)
      FROM page_rows
    ), '[]'::jsonb),
    'totalCount', (SELECT count(*) FROM filtered),
    'page', v_page,
    'pageSize', v_page_size,
    'summary', jsonb_build_object(
      'recentCount', (SELECT count(*) FROM public.platform_activity_events WHERE occurred_at >= now() - interval '24 hours'),
      'errorCount', (SELECT count(*) FROM public.platform_activity_events WHERE occurred_at >= now() - interval '24 hours' AND outcome = 'failure')
    )
  )
  INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_activity(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_platform_activity(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, INT, INT) TO authenticated;
