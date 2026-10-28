-- =============================================================================
-- Live database catch-up (generated from supabase/migrations; do not edit by hand)
-- Project: mklsgyxtjxednizjvaav
--
-- Brings the live database up to the repo's migrations 20261013000000 through
-- 20261028010000. Runs as ONE transaction: if any statement fails, nothing changes.
-- Regenerate with: node supabase/catchup/build-catchup.cjs .
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 20261013000000_workspace_subscriptions.sql
-- -----------------------------------------------------------------------------

-- 20261013000000_workspace_subscriptions.sql
-- Phase 1: workspace plan assignment & subscription lifecycle.
--
-- * One row per workspace. Workspaces WITHOUT a row resolve to the Free plan in
--   application code (src/services/planService.ts); no backfill is performed.
-- * Plan prices/limits live only in src/config/plans.ts (single source of truth).
-- * No payment card data, no payment-provider identifiers.
-- * Authenticated users may READ their workspace's row only. All writes require
--   the service role (operator) — no client path can assign a paid plan.

CREATE TABLE public.workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_id IN ('free', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  billing_interval TEXT
    CHECK (billing_interval IN ('month', 'year', 'custom')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  -- Enterprise-only configurable limits; validated against an explicit schema in app code.
  entitlement_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_subscriptions_period_order CHECK (
    current_period_start IS NULL OR current_period_end IS NULL
    OR current_period_end > current_period_start
  ),
  CONSTRAINT workspace_subscriptions_overrides_object CHECK (
    jsonb_typeof(entitlement_overrides) = 'object'
  ),
  CONSTRAINT workspace_subscriptions_overrides_enterprise_only CHECK (
    plan_id = 'enterprise' OR entitlement_overrides = '{}'::jsonb
  ),
  CONSTRAINT workspace_subscriptions_trial_requires_end CHECK (
    status <> 'trialing' OR trial_ends_at IS NOT NULL
  )
);

-- workspace_id lookups are served by the UNIQUE constraint's index.
CREATE INDEX workspace_subscriptions_plan_status_idx
  ON public.workspace_subscriptions (plan_id, status);

-- Reuse the existing helper from 20260926000002_integrations.sql.
CREATE TRIGGER set_updated_at_workspace_subscriptions
  BEFORE UPDATE ON public.workspace_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace subscription"
  ON public.workspace_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Intentionally NO insert/update/delete policies for anon/authenticated.
-- Defence in depth: also remove table-level write privileges.
REVOKE ALL ON public.workspace_subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.workspace_subscriptions FROM authenticated;
GRANT SELECT ON public.workspace_subscriptions TO authenticated;
GRANT ALL ON public.workspace_subscriptions TO service_role;

-- Rollback (manual):
--   DROP TABLE IF EXISTS public.workspace_subscriptions;

-- -----------------------------------------------------------------------------
-- 20261014000000_auth_registration_hardening.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 20261017000000_platform_admin_foundation.sql
-- [catch-up] Tables already exist live: CREATE TABLE/INDEX made IF NOT EXISTS, trigger dropped first.
-- -----------------------------------------------------------------------------

-- Platform administration is intentionally independent of workspace RBAC.
CREATE TABLE IF NOT EXISTS public.platform_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_roles_role_idx ON public.platform_roles (role);

CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  role TEXT NOT NULL CHECK (role = 'support'),
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);

INSERT INTO public.platform_role_permissions (role, permission)
VALUES ('support', 'console.view')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 160),
  target_type TEXT CHECK (target_type IS NULL OR length(target_type) <= 120),
  target_id TEXT CHECK (target_id IS NULL OR length(target_id) <= 200),
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 2000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_audit_logs_created_at_idx
  ON public.platform_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS platform_audit_logs_actor_created_at_idx
  ON public.platform_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_audit_logs_target_idx
  ON public.platform_audit_logs (target_type, target_id)
  WHERE target_type IS NOT NULL AND target_id IS NOT NULL;

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform role assignment and permission configuration are only accessible
-- through the narrowly scoped functions below, never through the Data API.
REVOKE ALL ON public.platform_roles FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.platform_role_permissions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.platform_audit_logs FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_platform_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      WHERE pr.user_id = auth.uid()
        AND pr.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      JOIN public.platform_role_permissions pp ON pp.role = pr.role
      WHERE pr.user_id = auth.uid()
        AND pr.role = 'support'
        AND pp.permission = p_permission
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.has_platform_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_platform_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'Platform audit logs are append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_platform_audit_log_mutation() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS platform_audit_logs_append_only ON public.platform_audit_logs;
CREATE TRIGGER platform_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON public.platform_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_platform_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.provision_initial_super_admin(
  p_actor_user_id UUID,
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing_role TEXT;
BEGIN
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Operator and target user IDs are required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('platform.initial_super_admin', 0));

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_actor_user_id
      AND email_confirmed_at IS NOT NULL
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Operator must be an existing confirmed account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_target_user_id
      AND email_confirmed_at IS NOT NULL
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target must be an existing confirmed account';
  END IF;

  SELECT role INTO existing_role
  FROM public.platform_roles
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF existing_role = 'super_admin' THEN
    RETURN FALSE;
  ELSIF existing_role IS NOT NULL THEN
    RAISE EXCEPTION 'Target already has a conflicting platform role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_roles WHERE role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Initial Super Admin has already been provisioned';
  END IF;

  INSERT INTO public.platform_roles (user_id, role)
  VALUES (p_target_user_id, 'super_admin');

  INSERT INTO public.platform_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    reason,
    metadata
  )
  VALUES (
    p_actor_user_id,
    'platform.super_admin.provisioned',
    'platform_role',
    p_target_user_id::TEXT,
    'Initial Super Admin provisioned by a platform operator.',
    jsonb_build_object('role', 'super_admin')
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_initial_super_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_initial_super_admin(UUID, UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 20261018000000_platform_customer_read.sql
-- -----------------------------------------------------------------------------

-- Customer reads are exposed only through permission-checked functions.
-- The functions run with the migration owner so they can join auth.users
-- without weakening any workspace RLS policies or exposing auth schema access.

CREATE OR REPLACE FUNCTION public.list_platform_customers(
  p_search TEXT DEFAULT NULL,
  p_plan TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'created_at',
  p_sort_direction TEXT DEFAULT 'desc',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  result JSONB;
  normalized_search TEXT := NULLIF(btrim(p_search), '');
  normalized_plan TEXT := NULLIF(btrim(p_plan), '');
  safe_sort TEXT := CASE WHEN p_sort IN ('name', 'created_at', 'event_count') THEN p_sort ELSE 'created_at' END;
  safe_direction TEXT := CASE WHEN lower(p_sort_direction) = 'asc' THEN 'asc' ELSE 'desc' END;
  safe_page INT := LEAST(GREATEST(COALESCE(p_page, 1), 1), 10000);
  safe_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
BEGIN
  IF NOT public.has_platform_permission('customers.read') THEN
    RAISE EXCEPTION 'Platform permission required' USING ERRCODE = '42501';
  END IF;

  IF normalized_plan IS NOT NULL AND normalized_plan NOT IN ('free', 'professional', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid subscription plan filter' USING ERRCODE = '22023';
  END IF;

  WITH workspace_counts AS (
    SELECT
      w.id,
      w.name,
      w.owner_id,
      w.created_at,
      owner_profile.full_name AS owner_name,
      owner_auth.email AS owner_email,
      member_counts.member_count,
      event_counts.event_count,
      subscription.plan_id,
      subscription.status AS subscription_status,
      subscription.billing_interval,
      subscription.current_period_end,
      subscription.cancel_at_period_end,
      (subscription.workspace_id IS NOT NULL) AS has_subscription
    FROM public.workspaces w
    LEFT JOIN public.profiles owner_profile ON owner_profile.id = w.owner_id
    LEFT JOIN auth.users owner_auth ON owner_auth.id = w.owner_id
    LEFT JOIN LATERAL (
      SELECT count(*)::BIGINT AS member_count
      FROM public.workspace_members wm
      WHERE wm.workspace_id = w.id
    ) member_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*)::BIGINT AS event_count
      FROM public.events e
      WHERE e.workspace_id = w.id
    ) event_counts ON TRUE
    LEFT JOIN public.workspace_subscriptions subscription ON subscription.workspace_id = w.id
  ),
  filtered AS (
    SELECT *
    FROM workspace_counts wc
    WHERE (
      normalized_search IS NULL
      OR position(lower(normalized_search) IN lower(wc.name)) > 0
      OR wc.id::TEXT = lower(normalized_search)
    )
    AND (
      normalized_plan IS NULL
      OR COALESCE(wc.plan_id, 'free') = normalized_plan
    )
  ),
  page_rows AS (
    SELECT *
    FROM filtered f
    ORDER BY
      CASE WHEN safe_sort = 'name' AND safe_direction = 'asc' THEN f.name END ASC,
      CASE WHEN safe_sort = 'name' AND safe_direction = 'desc' THEN f.name END DESC,
      CASE WHEN safe_sort = 'created_at' AND safe_direction = 'asc' THEN f.created_at END ASC,
      CASE WHEN safe_sort = 'created_at' AND safe_direction = 'desc' THEN f.created_at END DESC,
      CASE WHEN safe_sort = 'event_count' AND safe_direction = 'asc' THEN f.event_count END ASC,
      CASE WHEN safe_sort = 'event_count' AND safe_direction = 'desc' THEN f.event_count END DESC,
      f.id ASC
    LIMIT safe_page_size
    OFFSET (safe_page - 1) * safe_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'name', pr.name,
        'ownerId', pr.owner_id,
        'ownerName', pr.owner_name,
        'ownerEmail', pr.owner_email,
        'memberCount', pr.member_count,
        'eventCount', pr.event_count,
        'createdAt', pr.created_at,
        'planId', COALESCE(pr.plan_id, 'free'),
        'subscriptionStatus', pr.subscription_status,
        'billingInterval', pr.billing_interval,
        'currentPeriodEnd', pr.current_period_end,
        'cancelAtPeriodEnd', pr.cancel_at_period_end,
        'hasSubscription', pr.has_subscription
      ))
      FROM page_rows pr
    ), '[]'::JSONB),
    'totalCount', (SELECT count(*) FROM filtered),
    'page', safe_page,
    'pageSize', safe_page_size,
    'summary', jsonb_build_object(
      'organizationCount', (SELECT count(*) FROM public.workspaces),
      'activeSubscriptionCount', (
        SELECT count(*)
        FROM public.workspace_subscriptions
        WHERE status IN ('active', 'trialing')
      ),
      'eventCount', (SELECT count(*) FROM public.events)
    )
  )
  INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_customer_detail(
  p_workspace_id UUID,
  p_member_page INT DEFAULT 1,
  p_event_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  result JSONB;
  safe_member_page INT := LEAST(GREATEST(COALESCE(p_member_page, 1), 1), 10000);
  safe_event_page INT := LEAST(GREATEST(COALESCE(p_event_page, 1), 1), 10000);
  safe_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
BEGIN
  IF NOT public.has_platform_permission('customers.read') THEN
    RAISE EXCEPTION 'Platform permission required' USING ERRCODE = '42501';
  END IF;

  WITH selected_workspace AS (
    SELECT
      w.id,
      w.name,
      w.owner_id,
      w.created_at,
      owner_profile.full_name AS owner_name,
      owner_auth.email AS owner_email,
      subscription.plan_id,
      subscription.status AS subscription_status,
      subscription.billing_interval,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.trial_ends_at,
      subscription.cancel_at_period_end,
      subscription.entitlement_overrides,
      (subscription.workspace_id IS NOT NULL) AS has_subscription
    FROM public.workspaces w
    LEFT JOIN public.profiles owner_profile ON owner_profile.id = w.owner_id
    LEFT JOIN auth.users owner_auth ON owner_auth.id = w.owner_id
    LEFT JOIN public.workspace_subscriptions subscription ON subscription.workspace_id = w.id
    WHERE w.id = p_workspace_id
  ),
  member_page AS (
    SELECT
      wm.user_id,
      profile.full_name,
      auth_user.email,
      role.name AS workspace_role,
      wm.created_at AS joined_at
    FROM public.workspace_members wm
    LEFT JOIN public.profiles profile ON profile.id = wm.user_id
    LEFT JOIN auth.users auth_user ON auth_user.id = wm.user_id
    LEFT JOIN public.roles role ON role.id = wm.role_id
    WHERE wm.workspace_id = p_workspace_id
    ORDER BY profile.full_name NULLS LAST, wm.user_id
    LIMIT safe_page_size
    OFFSET (safe_member_page - 1) * safe_page_size
  ),
  event_page AS (
    SELECT e.id, e.name, e.start_date, e.status, e.created_at
    FROM public.events e
    WHERE e.workspace_id = p_workspace_id
    ORDER BY e.start_date DESC, e.created_at DESC, e.id
    LIMIT safe_page_size
    OFFSET (safe_event_page - 1) * safe_page_size
  )
  SELECT CASE WHEN EXISTS (SELECT 1 FROM selected_workspace) THEN
    jsonb_build_object(
      'organization', (
        SELECT jsonb_build_object(
          'id', sw.id,
          'name', sw.name,
          'ownerId', sw.owner_id,
          'ownerName', sw.owner_name,
          'ownerEmail', sw.owner_email,
          'createdAt', sw.created_at,
          'memberCount', (SELECT count(*) FROM public.workspace_members WHERE workspace_id = sw.id),
          'eventCount', (SELECT count(*) FROM public.events WHERE workspace_id = sw.id),
          'planId', COALESCE(sw.plan_id, 'free'),
          'subscriptionStatus', sw.subscription_status,
          'billingInterval', sw.billing_interval,
          'currentPeriodStart', sw.current_period_start,
          'currentPeriodEnd', sw.current_period_end,
          'trialEndsAt', sw.trial_ends_at,
          'cancelAtPeriodEnd', sw.cancel_at_period_end,
          'entitlementOverrides', CASE WHEN sw.has_subscription THEN sw.entitlement_overrides ELSE NULL END,
          'hasSubscription', sw.has_subscription
        )
        FROM selected_workspace sw
      ),
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'userId', mp.user_id,
          'name', mp.full_name,
          'email', mp.email,
          'role', mp.workspace_role,
          'joinedAt', mp.joined_at
        ))
        FROM member_page mp
      ), '[]'::JSONB),
      'membersTotal', (SELECT count(*) FROM public.workspace_members WHERE workspace_id = p_workspace_id),
      'memberPage', safe_member_page,
      'events', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ep.id,
          'name', ep.name,
          'startDate', ep.start_date,
          'status', ep.status,
          'createdAt', ep.created_at
        ))
        FROM event_page ep
      ), '[]'::JSONB),
      'eventsTotal', (SELECT count(*) FROM public.events WHERE workspace_id = p_workspace_id),
      'eventPage', safe_event_page,
      'pageSize', safe_page_size
    )
  ELSE NULL END
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_customers(TEXT, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_platform_customer_detail(UUID, INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_platform_customers(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_customer_detail(UUID, INT, INT, INT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 20261019000000_platform_activity_events.sql
-- [catch-up] Made re-runnable (IF NOT EXISTS / DROP TRIGGER IF EXISTS).
-- -----------------------------------------------------------------------------

-- Operational diagnostics are separate from the platform audit log, which remains
-- reserved for privileged administrative actions.
CREATE TABLE IF NOT EXISTS public.platform_activity_events (
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

CREATE INDEX IF NOT EXISTS platform_activity_occurred_idx
  ON public.platform_activity_events (occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS platform_activity_workspace_occurred_idx
  ON public.platform_activity_events (workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_activity_category_occurred_idx
  ON public.platform_activity_events (category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_activity_action_occurred_idx
  ON public.platform_activity_events (action, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_activity_outcome_severity_idx
  ON public.platform_activity_events (outcome, severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_activity_correlation_idx
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

DROP TRIGGER IF EXISTS platform_activity_events_append_only ON public.platform_activity_events;
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

DROP TRIGGER IF EXISTS events_platform_activity ON public.events;
CREATE TRIGGER events_platform_activity
  AFTER INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
DROP TRIGGER IF EXISTS registrations_platform_activity ON public.registrations;
CREATE TRIGGER registrations_platform_activity
  AFTER INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
DROP TRIGGER IF EXISTS qr_credentials_platform_activity ON public.qr_credentials;
CREATE TRIGGER qr_credentials_platform_activity
  AFTER INSERT ON public.qr_credentials
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
DROP TRIGGER IF EXISTS check_ins_platform_activity ON public.check_ins;
CREATE TRIGGER check_ins_platform_activity
  AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.capture_platform_activity();
DROP TRIGGER IF EXISTS integration_jobs_platform_activity ON public.integration_jobs;
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

-- -----------------------------------------------------------------------------
-- 20261019000001_fix_event_write_rls.sql
-- -----------------------------------------------------------------------------

-- Replace membership-only event write policies with role-permission checks.
DROP POLICY IF EXISTS "Users can insert events in their workspaces" ON public.events;
DROP POLICY IF EXISTS "Users can update events in their workspaces" ON public.events;
DROP POLICY IF EXISTS "Users can delete events in their workspaces" ON public.events;

CREATE POLICY "Users can insert events in their workspaces"
  ON public.events FOR INSERT
  WITH CHECK (public.has_permission(workspace_id, 'events.create'));

CREATE POLICY "Users can update events in their workspaces"
  ON public.events FOR UPDATE
  USING (public.has_permission(workspace_id, 'events.update'))
  WITH CHECK (public.has_permission(workspace_id, 'events.update'));

CREATE POLICY "Users can delete events in their workspaces"
  ON public.events FOR DELETE
  USING (public.has_permission(workspace_id, 'events.delete'));

-- -----------------------------------------------------------------------------
-- 20261019000002_integration_jobs_rpc_acl.sql
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.claim_integration_jobs(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_integration_jobs(INTEGER, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_integration_jobs_for_registration(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_integration_jobs_for_registration(UUID, TEXT)
  TO service_role;

-- -----------------------------------------------------------------------------
-- 20261019000003_event_flyer_storage_owner_policies.sql
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated Insert Access for Event Flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for Event Flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for Event Flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access for Org Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for Org Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for Org Logos" ON storage.objects;

CREATE POLICY "Users can insert own event flyer objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can update own event flyer objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete own event flyer objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);

CREATE POLICY "Users can insert own organization logo objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can update own organization logo objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete own organization logo objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);

-- -----------------------------------------------------------------------------
-- 20261020000000_security_remediation_suite.sql
-- [catch-up] Dropped the anon revokes on is_workspace_member / has_permission / get_workspace_from_event: they break every anonymous read of events and registrations (see 20261028010000).
-- -----------------------------------------------------------------------------

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

-- [catch-up] Anon revokes on is_workspace_member / has_permission /
-- get_workspace_from_event removed: RLS policies TO public call them, so anon
-- needs EXECUTE. 20261028010000 documents this and is re-run at the end.

-- -----------------------------------------------------------------------------
-- 20261023000000_master_admin_portal.sql
-- [catch-up] Older versions of has_platform_permission / record_platform_audit_log; 20261028000000 is re-run next to restore the live ones.
-- -----------------------------------------------------------------------------

-- 20261023000000_master_admin_portal.sql
-- Master Admin Portal Foundation: Multi-role model, status flags, event moderation,
-- workspace suspension, audit log querying and cross-workspace management.

-- 1. Extend platform_roles with is_active flag and support additional platform roles
ALTER TABLE public.platform_roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Update role constraint on platform_roles to allow super_admin, support, moderator,
-- as well as platform_ prefixed equivalents for backwards compatibility
ALTER TABLE public.platform_roles
  DROP CONSTRAINT IF EXISTS platform_roles_role_check;

ALTER TABLE public.platform_roles
  ADD CONSTRAINT platform_roles_role_check
  CHECK (role IN ('super_admin', 'support', 'moderator', 'platform_super_admin', 'platform_support', 'platform_moderator'));

-- Update role constraint on platform_role_permissions
ALTER TABLE public.platform_role_permissions
  DROP CONSTRAINT IF EXISTS platform_role_permissions_role_check;

ALTER TABLE public.platform_role_permissions
  ADD CONSTRAINT platform_role_permissions_role_check
  CHECK (role IN ('support', 'moderator', 'platform_support', 'platform_moderator'));

-- Seed default permissions for platform roles
INSERT INTO public.platform_role_permissions (role, permission)
VALUES
  ('support', 'console.view'),
  ('support', 'customers.read'),
  ('support', 'events.read'),
  ('support', 'activity.read'),
  ('moderator', 'console.view'),
  ('moderator', 'customers.read'),
  ('moderator', 'events.read'),
  ('moderator', 'events.moderate'),
  ('moderator', 'activity.read')
ON CONFLICT DO NOTHING;

-- 2. Enhance has_platform_permission to enforce active status and support new roles
CREATE OR REPLACE FUNCTION public.has_platform_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      WHERE pr.user_id = auth.uid()
        AND pr.is_active = true
        AND pr.role IN ('super_admin', 'platform_super_admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      JOIN public.platform_role_permissions pp ON pp.role = pr.role
      WHERE pr.user_id = auth.uid()
        AND pr.is_active = true
        AND pp.permission = p_permission
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.has_platform_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(TEXT) TO authenticated;

-- 3. Add suspension columns to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_workspaces_is_suspended
  ON public.workspaces (is_suspended)
  WHERE is_suspended = true;

-- 4. Add moderation columns to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_moderated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'normal'
    CHECK (moderation_status IN ('normal', 'flagged', 'suspended')),
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_events_moderation_status
  ON public.events (moderation_status)
  WHERE moderation_status != 'normal';

-- 5. Helper function to record audit logs securely
CREATE OR REPLACE FUNCTION public.record_platform_audit_log(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_id UUID;
  actor_id UUID := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for platform audit logging' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required to record audit log' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.platform_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    reason,
    metadata
  )
  VALUES (
    actor_id,
    p_action,
    p_target_type,
    p_target_id,
    p_reason,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_platform_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_platform_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 6. RPC: Query Master Admin Overview Metrics
CREATE OR REPLACE FUNCTION public.get_platform_overview_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  metrics JSONB;
BEGIN
  IF NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required' USING ERRCODE = '42501';
  END IF;

  WITH counts AS (
    SELECT
      (SELECT count(*)::BIGINT FROM public.workspaces) AS total_workspaces,
      (SELECT count(*)::BIGINT FROM public.workspaces WHERE is_suspended = true) AS suspended_workspaces,
      (SELECT count(DISTINCT owner_id)::BIGINT FROM public.workspaces WHERE owner_id IS NOT NULL) AS total_organizers,
      (SELECT count(*)::BIGINT FROM public.events) AS total_events,
      (SELECT count(*)::BIGINT FROM public.events WHERE status = 'draft') AS draft_events,
      (SELECT count(*)::BIGINT FROM public.events WHERE status = 'published') AS published_events,
      (SELECT count(*)::BIGINT FROM public.events WHERE status = 'archived') AS archived_events,
      (SELECT count(*)::BIGINT FROM public.events WHERE status = 'published' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE) AS live_events,
      (SELECT count(*)::BIGINT FROM public.events WHERE moderation_status != 'normal' OR is_moderated = true) AS moderated_events,
      (SELECT count(*)::BIGINT FROM public.registrations) AS total_registrations
  ),
  recent_workspaces AS (
    SELECT jsonb_agg(w_row)
    FROM (
      SELECT
        w.id,
        w.name,
        w.slug,
        w.is_suspended,
        w.created_at,
        p.full_name AS owner_name,
        u.email AS owner_email
      FROM public.workspaces w
      LEFT JOIN public.profiles p ON p.id = w.owner_id
      LEFT JOIN auth.users u ON u.id = w.owner_id
      ORDER BY w.created_at DESC
      LIMIT 5
    ) w_row
  ),
  recent_events AS (
    SELECT jsonb_agg(e_row)
    FROM (
      SELECT
        e.id,
        e.name,
        e.slug,
        e.status,
        e.moderation_status,
        e.start_date,
        e.created_at,
        w.name AS workspace_name
      FROM public.events e
      JOIN public.workspaces w ON w.id = e.workspace_id
      ORDER BY e.created_at DESC
      LIMIT 5
    ) e_row
  ),
  recent_audits AS (
    SELECT jsonb_agg(a_row)
    FROM (
      SELECT
        al.id,
        al.action,
        al.target_type,
        al.target_id,
        al.reason,
        al.created_at,
        u.email AS actor_email
      FROM public.platform_audit_logs al
      LEFT JOIN auth.users u ON u.id = al.actor_user_id
      ORDER BY al.created_at DESC
      LIMIT 5
    ) a_row
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalWorkspaces', c.total_workspaces,
      'suspendedWorkspaces', c.suspended_workspaces,
      'totalOrganizers', c.total_organizers,
      'totalEvents', c.total_events,
      'draftEvents', c.draft_events,
      'publishedEvents', c.published_events,
      'archivedEvents', c.archived_events,
      'liveEvents', c.live_events,
      'moderatedEvents', c.moderated_events,
      'totalRegistrations', c.total_registrations
    ),
    'recentWorkspaces', COALESCE((SELECT * FROM recent_workspaces), '[]'::jsonb),
    'recentEvents', COALESCE((SELECT * FROM recent_events), '[]'::jsonb),
    'recentAudits', COALESCE((SELECT * FROM recent_audits), '[]'::jsonb)
  ) INTO metrics
  FROM counts c;

  RETURN metrics;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_overview_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_overview_metrics() TO authenticated;

-- 7. RPC: Workspace Status Management (Suspend / Reactivate)
CREATE OR REPLACE FUNCTION public.manage_platform_workspace_suspension(
  p_workspace_id UUID,
  p_suspend BOOLEAN,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller_id UUID := auth.uid();
  w_record RECORD;
BEGIN
  IF NOT public.has_platform_permission('customers.read') THEN
    RAISE EXCEPTION 'Platform permission required to manage workspace status' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A valid explanation (minimum 3 characters) is required' USING ERRCODE = '22023';
  END IF;

  SELECT id, name, is_suspended INTO w_record
  FROM public.workspaces
  WHERE id = p_workspace_id
  FOR UPDATE;

  IF w_record.id IS NULL THEN
    RAISE EXCEPTION 'Workspace not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.workspaces
  SET
    is_suspended = p_suspend,
    suspended_at = CASE WHEN p_suspend THEN now() ELSE NULL END,
    suspended_reason = CASE WHEN p_suspend THEN btrim(p_reason) ELSE NULL END,
    suspended_by = CASE WHEN p_suspend THEN caller_id ELSE NULL END,
    updated_at = now()
  WHERE id = p_workspace_id;

  INSERT INTO public.platform_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    reason,
    metadata
  )
  VALUES (
    caller_id,
    CASE WHEN p_suspend THEN 'workspace.suspended' ELSE 'workspace.reactivated' END,
    'workspace',
    p_workspace_id::TEXT,
    btrim(p_reason),
    jsonb_build_object(
      'workspace_name', w_record.name,
      'previous_state', w_record.is_suspended,
      'new_state', p_suspend
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'workspaceId', p_workspace_id,
    'isSuspended', p_suspend,
    'reason', p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_platform_workspace_suspension(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_platform_workspace_suspension(UUID, BOOLEAN, TEXT) TO authenticated;

-- 8. RPC: List Platform Events (Cross-workspace event directory)
CREATE OR REPLACE FUNCTION public.list_platform_events(
  p_search TEXT DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_moderation_status TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'created_at',
  p_sort_direction TEXT DEFAULT 'desc',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  normalized_search TEXT := NULLIF(btrim(p_search), '');
  normalized_status TEXT := NULLIF(btrim(p_status), '');
  normalized_moderation TEXT := NULLIF(btrim(p_moderation_status), '');
  safe_sort TEXT := CASE WHEN p_sort IN ('name', 'created_at', 'start_date', 'status') THEN p_sort ELSE 'created_at' END;
  safe_direction TEXT := CASE WHEN lower(p_sort_direction) = 'asc' THEN 'asc' ELSE 'desc' END;
  safe_page INT := LEAST(GREATEST(COALESCE(p_page, 1), 1), 10000);
  safe_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  total_count BIGINT;
  result JSONB;
BEGIN
  IF NOT public.has_platform_permission('events.read') AND NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required to view events' USING ERRCODE = '42501';
  END IF;

  WITH filtered_events AS (
    SELECT
      e.id,
      e.name,
      e.slug,
      e.status,
      e.type,
      e.format,
      e.start_date,
      e.end_date,
      e.start_time,
      e.end_time,
      e.timezone,
      e.location,
      e.is_moderated,
      e.moderation_status,
      e.moderation_reason,
      e.created_at,
      w.id AS workspace_id,
      w.name AS workspace_name,
      w.is_suspended AS workspace_is_suspended,
      p.full_name AS organizer_name,
      u.email AS organizer_email,
      COALESCE(reg_counts.reg_count, 0) AS registration_count
    FROM public.events e
    JOIN public.workspaces w ON w.id = e.workspace_id
    LEFT JOIN public.profiles p ON p.id = e.created_by
    LEFT JOIN auth.users u ON u.id = e.created_by
    LEFT JOIN LATERAL (
      SELECT count(*)::BIGINT AS reg_count
      FROM public.registrations r
      WHERE r.event_id = e.id
    ) reg_counts ON TRUE
    WHERE (
      normalized_search IS NULL
      OR position(lower(normalized_search) IN lower(e.name)) > 0
      OR position(lower(normalized_search) IN lower(e.slug)) > 0
      OR position(lower(normalized_search) IN lower(w.name)) > 0
      OR e.id::TEXT = lower(normalized_search)
    )
    AND (p_workspace_id IS NULL OR e.workspace_id = p_workspace_id)
    AND (normalized_status IS NULL OR e.status = normalized_status)
    AND (normalized_moderation IS NULL OR e.moderation_status = normalized_moderation)
  )
  SELECT
    count(*),
    jsonb_agg(row_data)
  INTO total_count, result
  FROM (
    SELECT jsonb_build_object(
      'id', fe.id,
      'name', fe.name,
      'slug', fe.slug,
      'status', fe.status,
      'type', fe.type,
      'format', fe.format,
      'startDate', fe.start_date,
      'endDate', fe.end_date,
      'startTime', fe.start_time,
      'endTime', fe.end_time,
      'timezone', fe.timezone,
      'location', fe.location,
      'isModerated', fe.is_moderated,
      'moderationStatus', fe.moderation_status,
      'moderationReason', fe.moderation_reason,
      'createdAt', fe.created_at,
      'workspaceId', fe.workspace_id,
      'workspaceName', fe.workspace_name,
      'workspaceIsSuspended', fe.workspace_is_suspended,
      'organizerName', fe.organizer_name,
      'organizerEmail', fe.organizer_email,
      'registrationCount', fe.registration_count
    ) AS row_data
    FROM filtered_events fe
    ORDER BY
      CASE WHEN safe_sort = 'name' AND safe_direction = 'asc' THEN fe.name END ASC,
      CASE WHEN safe_sort = 'name' AND safe_direction = 'desc' THEN fe.name END DESC,
      CASE WHEN safe_sort = 'created_at' AND safe_direction = 'asc' THEN fe.created_at END ASC,
      CASE WHEN safe_sort = 'created_at' AND safe_direction = 'desc' THEN fe.created_at END DESC,
      CASE WHEN safe_sort = 'start_date' AND safe_direction = 'asc' THEN fe.start_date END ASC,
      CASE WHEN safe_sort = 'start_date' AND safe_direction = 'desc' THEN fe.start_date END DESC,
      fe.id ASC
    LIMIT safe_page_size
    OFFSET (safe_page - 1) * safe_page_size
  ) ordered_rows;

  RETURN jsonb_build_object(
    'items', COALESCE(result, '[]'::jsonb),
    'totalCount', COALESCE(total_count, 0),
    'page', safe_page,
    'pageSize', safe_page_size
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_events(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_platform_events(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

-- 9. RPC: Event Moderation (Flag, Suspend, Unpublish, Restore)
CREATE OR REPLACE FUNCTION public.moderate_platform_event(
  p_event_id UUID,
  p_action TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller_id UUID := auth.uid();
  e_record RECORD;
  new_moderation_status TEXT;
  new_is_moderated BOOLEAN;
  new_status TEXT;
BEGIN
  IF NOT public.has_platform_permission('events.moderate') AND NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required to moderate events' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A valid reason (minimum 3 characters) is required' USING ERRCODE = '22023';
  END IF;

  IF p_action NOT IN ('flag', 'suspend', 'unpublish', 'archive', 'restore') THEN
    RAISE EXCEPTION 'Invalid moderation action: %', p_action USING ERRCODE = '22023';
  END IF;

  SELECT id, name, workspace_id, status, moderation_status INTO e_record
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF e_record.id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;

  CASE p_action
    WHEN 'flag' THEN
      new_moderation_status := 'flagged';
      new_is_moderated := true;
      new_status := e_record.status;
    WHEN 'suspend' THEN
      new_moderation_status := 'suspended';
      new_is_moderated := true;
      new_status := 'archived';
    WHEN 'unpublish' THEN
      new_moderation_status := e_record.moderation_status;
      new_is_moderated := true;
      new_status := 'draft';
    WHEN 'archive' THEN
      new_moderation_status := e_record.moderation_status;
      new_is_moderated := true;
      new_status := 'archived';
    WHEN 'restore' THEN
      new_moderation_status := 'normal';
      new_is_moderated := false;
      new_status := 'published';
  END CASE;

  UPDATE public.events
  SET
    status = new_status,
    moderation_status = new_moderation_status,
    is_moderated = new_is_moderated,
    moderation_reason = btrim(p_reason),
    moderated_at = now(),
    moderated_by = caller_id,
    updated_at = now()
  WHERE id = p_event_id;

  INSERT INTO public.platform_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    reason,
    metadata
  )
  VALUES (
    caller_id,
    'event.moderated.' || p_action,
    'event',
    p_event_id::TEXT,
    btrim(p_reason),
    jsonb_build_object(
      'event_name', e_record.name,
      'workspace_id', e_record.workspace_id,
      'previous_status', e_record.status,
      'new_status', new_status,
      'previous_moderation', e_record.moderation_status,
      'new_moderation', new_moderation_status
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'eventId', p_event_id,
    'status', new_status,
    'moderationStatus', new_moderation_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_platform_event(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_platform_event(UUID, TEXT, TEXT) TO authenticated;

-- 10. RPC: List Platform Audit Logs
CREATE OR REPLACE FUNCTION public.list_platform_audit_logs(
  p_search TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  normalized_search TEXT := NULLIF(btrim(p_search), '');
  normalized_action TEXT := NULLIF(btrim(p_action), '');
  normalized_target TEXT := NULLIF(btrim(p_target_type), '');
  safe_page INT := LEAST(GREATEST(COALESCE(p_page, 1), 1), 10000);
  safe_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  total_count BIGINT;
  result JSONB;
BEGIN
  IF NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required to view audit logs' USING ERRCODE = '42501';
  END IF;

  WITH filtered_logs AS (
    SELECT
      al.id,
      al.actor_user_id,
      al.action,
      al.target_type,
      al.target_id,
      al.reason,
      al.metadata,
      al.created_at,
      u.email AS actor_email
    FROM public.platform_audit_logs al
    LEFT JOIN auth.users u ON u.id = al.actor_user_id
    WHERE (
      normalized_search IS NULL
      OR position(lower(normalized_search) IN lower(al.action)) > 0
      OR position(lower(normalized_search) IN lower(COALESCE(al.reason, ''))) > 0
      OR position(lower(normalized_search) IN lower(COALESCE(al.target_id, ''))) > 0
      OR position(lower(normalized_search) IN lower(COALESCE(u.email, ''))) > 0
    )
    AND (normalized_action IS NULL OR al.action = normalized_action)
    AND (normalized_target IS NULL OR al.target_type = normalized_target)
    AND (p_from IS NULL OR al.created_at >= p_from)
    AND (p_to IS NULL OR al.created_at <= p_to)
  )
  SELECT
    count(*),
    jsonb_agg(row_data)
  INTO total_count, result
  FROM (
    SELECT jsonb_build_object(
      'id', fl.id,
      'actorUserId', fl.actor_user_id,
      'actorEmail', fl.actor_email,
      'action', fl.action,
      'targetType', fl.target_type,
      'targetId', fl.target_id,
      'reason', fl.reason,
      'metadata', fl.metadata,
      'createdAt', fl.created_at
    ) AS row_data
    FROM filtered_logs fl
    ORDER BY fl.created_at DESC
    LIMIT safe_page_size
    OFFSET (safe_page - 1) * safe_page_size
  ) ordered_rows;

  RETURN jsonb_build_object(
    'items', COALESCE(result, '[]'::jsonb),
    'totalCount', COALESCE(total_count, 0),
    'page', safe_page,
    'pageSize', safe_page_size
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_audit_logs(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_platform_audit_logs(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) TO authenticated;

-- 11. RPC: Platform Analytics Aggregations
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  analytics JSONB;
BEGIN
  IF NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required to view analytics' USING ERRCODE = '42501';
  END IF;

  WITH monthly_workspaces AS (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      count(*)::BIGINT AS count
    FROM public.workspaces
    WHERE created_at >= now() - INTERVAL '12 months'
    GROUP BY 1
    ORDER BY 1 ASC
  ),
  monthly_events AS (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      count(*)::BIGINT AS count
    FROM public.events
    WHERE created_at >= now() - INTERVAL '12 months'
    GROUP BY 1
    ORDER BY 1 ASC
  ),
  monthly_registrations AS (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      count(*)::BIGINT AS count
    FROM public.registrations
    WHERE created_at >= now() - INTERVAL '12 months'
    GROUP BY 1
    ORDER BY 1 ASC
  ),
  events_by_status AS (
    SELECT status, count(*)::BIGINT AS count
    FROM public.events
    GROUP BY status
  ),
  events_by_type AS (
    SELECT type, count(*)::BIGINT AS count
    FROM public.events
    GROUP BY type
    ORDER BY count DESC
    LIMIT 6
  ),
  plan_distribution AS (
    SELECT
      COALESCE(plan_id, 'free') AS plan,
      count(*)::BIGINT AS count
    FROM public.workspace_subscriptions
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'workspacesGrowth', COALESCE((SELECT jsonb_agg(w) FROM monthly_workspaces w), '[]'::jsonb),
    'eventsGrowth', COALESCE((SELECT jsonb_agg(e) FROM monthly_events e), '[]'::jsonb),
    'registrationsGrowth', COALESCE((SELECT jsonb_agg(r) FROM monthly_registrations r), '[]'::jsonb),
    'eventsByStatus', COALESCE((SELECT jsonb_agg(s) FROM events_by_status s), '[]'::jsonb),
    'eventsByType', COALESCE((SELECT jsonb_agg(t) FROM events_by_type t), '[]'::jsonb),
    'planDistribution', COALESCE((SELECT jsonb_agg(p) FROM plan_distribution p), '[]'::jsonb)
  ) INTO analytics;

  RETURN analytics;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_analytics() TO authenticated;

-- -----------------------------------------------------------------------------
-- 20261028000000_super_admin_live.sql
-- [catch-up] Already applied by hand; re-run (it is idempotent) so its newer functions win over 20261023.
-- -----------------------------------------------------------------------------

-- 20261028000000_super_admin_live.sql
-- One self-contained, re-runnable script that brings the live database up to
-- what the Super Admin console needs. Safe to paste into the Supabase SQL
-- editor and run more than once.
--
--   A. Platform roles & permissions (super_admin / support / moderator)
--   B. Audit log helper + grants used by the console's server
--   C. Workspace suspension columns
--   M. Database monitoring & platform settings

-- A1. Role constraints
ALTER TABLE public.platform_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.platform_roles ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id);
ALTER TABLE public.platform_roles DROP CONSTRAINT IF EXISTS platform_roles_role_check;
ALTER TABLE public.platform_roles ADD CONSTRAINT platform_roles_role_check
  CHECK (role IN ('super_admin', 'support', 'moderator', 'platform_super_admin', 'platform_support', 'platform_moderator'));

ALTER TABLE public.platform_role_permissions DROP CONSTRAINT IF EXISTS platform_role_permissions_role_check;
ALTER TABLE public.platform_role_permissions ADD CONSTRAINT platform_role_permissions_role_check
  CHECK (role IN ('support', 'moderator', 'platform_support', 'platform_moderator'));

INSERT INTO public.platform_role_permissions (role, permission)
VALUES
  ('support', 'console.view'), ('support', 'customers.read'), ('support', 'events.read'), ('support', 'activity.read'),
  ('moderator', 'console.view'), ('moderator', 'customers.read'), ('moderator', 'events.read'),
  ('moderator', 'events.moderate'), ('moderator', 'activity.read')
ON CONFLICT DO NOTHING;

-- A2. Permission check that honours is_active
CREATE OR REPLACE FUNCTION public.has_platform_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1 FROM public.platform_roles pr
      WHERE pr.user_id = auth.uid() AND pr.is_active = true
        AND pr.role IN ('super_admin', 'platform_super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_roles pr
      JOIN public.platform_role_permissions pp ON pp.role = pr.role
      WHERE pr.user_id = auth.uid() AND pr.is_active = true AND pp.permission = p_permission
    ),
    FALSE
  );
$$;
REVOKE ALL ON FUNCTION public.has_platform_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(TEXT) TO authenticated;

-- B1. Audit log helper (called with the admin's own session)
CREATE OR REPLACE FUNCTION public.record_platform_audit_log(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required to record audit log' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.platform_audit_logs (actor_user_id, action, target_type, target_id, reason, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_reason, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_platform_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_platform_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- B2. The console's server code (service role, after an in-app permission
--     check) reads the audit log and manages platform roles.
--     Browsers never touch these tables directly; RLS already blocks them, and
--     the explicit revoke keeps it that way if a policy is ever added.
REVOKE ALL ON public.platform_audit_logs, public.platform_roles, public.platform_role_permissions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.platform_audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_roles TO service_role;
GRANT SELECT ON public.platform_role_permissions TO service_role;

-- C1. Workspace suspension
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_suspended ON public.workspaces (is_suspended) WHERE is_suspended = true;

-- M1. Permissions. super_admin implicitly holds every permission; support and
--    moderator may read monitoring but never change settings.
INSERT INTO public.platform_role_permissions (role, permission)
VALUES
  ('support', 'monitoring.read'),
  ('moderator', 'monitoring.read')
ON CONFLICT DO NOTHING;

-- M2. Platform settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY CHECK (key IN ('monitoring')),
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_settings TO service_role;

INSERT INTO public.platform_settings (key, value)
VALUES (
  'monitoring',
  jsonb_build_object(
    'captureEnabled', true,
    'sampleRate', 100,
    'slowCallMs', 500,
    'retentionDays', 14,
    'errorRateAlertPct', 5
  )
)
ON CONFLICT (key) DO NOTHING;

-- M3. Database call metrics (one row per minute × source × target × method)
CREATE TABLE IF NOT EXISTS public.platform_db_call_metrics (
  bucket TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (char_length(source) <= 32),
  target_kind TEXT NOT NULL CHECK (target_kind IN ('table', 'rpc', 'auth', 'storage', 'functions', 'other')),
  target TEXT NOT NULL CHECK (char_length(target) <= 96),
  method TEXT NOT NULL CHECK (method IN ('GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OTHER')),
  calls INTEGER NOT NULL DEFAULT 0 CHECK (calls >= 0),
  errors INTEGER NOT NULL DEFAULT 0 CHECK (errors >= 0),
  slow_calls INTEGER NOT NULL DEFAULT 0 CHECK (slow_calls >= 0),
  total_ms BIGINT NOT NULL DEFAULT 0 CHECK (total_ms >= 0),
  max_ms INTEGER NOT NULL DEFAULT 0 CHECK (max_ms >= 0),
  PRIMARY KEY (bucket, source, target_kind, target, method)
);

CREATE INDEX IF NOT EXISTS idx_platform_db_call_metrics_bucket
  ON public.platform_db_call_metrics (bucket DESC);

ALTER TABLE public.platform_db_call_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_db_call_metrics FROM PUBLIC, anon, authenticated;

-- M4. Ingest (service role only). Accepts a bounded batch of pre-aggregated rows,
--    increments existing buckets, and prunes rows past the retention window.
CREATE OR REPLACE FUNCTION public.ingest_platform_db_call_metrics(p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count INTEGER;
  v_retention INTEGER;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN 0;
  END IF;

  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Too many metric rows in one batch' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.platform_db_call_metrics AS m
    (bucket, source, target_kind, target, method, calls, errors, slow_calls, total_ms, max_ms)
  SELECT
    date_trunc('minute', (r->>'bucket')::timestamptz),
    left(r->>'source', 32),
    CASE WHEN r->>'targetKind' IN ('table', 'rpc', 'auth', 'storage', 'functions') THEN r->>'targetKind' ELSE 'other' END,
    left(COALESCE(NULLIF(r->>'target', ''), 'unknown'), 96),
    CASE WHEN r->>'method' IN ('GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE') THEN r->>'method' ELSE 'OTHER' END,
    GREATEST(0, (r->>'calls')::int),
    GREATEST(0, COALESCE((r->>'errors')::int, 0)),
    GREATEST(0, COALESCE((r->>'slowCalls')::int, 0)),
    GREATEST(0, COALESCE((r->>'totalMs')::bigint, 0)),
    GREATEST(0, COALESCE((r->>'maxMs')::int, 0))
  FROM jsonb_array_elements(p_rows) r
  WHERE (r->>'bucket')::timestamptz > now() - INTERVAL '1 day'
    AND (r->>'bucket')::timestamptz < now() + INTERVAL '5 minutes'
    AND COALESCE((r->>'calls')::int, 0) > 0
    AND r->>'source' IS NOT NULL
  ON CONFLICT (bucket, source, target_kind, target, method) DO UPDATE SET
    calls = m.calls + EXCLUDED.calls,
    errors = m.errors + EXCLUDED.errors,
    slow_calls = m.slow_calls + EXCLUDED.slow_calls,
    total_ms = m.total_ms + EXCLUDED.total_ms,
    max_ms = GREATEST(m.max_ms, EXCLUDED.max_ms);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  SELECT COALESCE((value->>'retentionDays')::int, 14)
    INTO v_retention
    FROM public.platform_settings
   WHERE key = 'monitoring';

  DELETE FROM public.platform_db_call_metrics
   WHERE bucket < now() - make_interval(days => GREATEST(1, COALESCE(v_retention, 14)));

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_platform_db_call_metrics(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_platform_db_call_metrics(JSONB) TO service_role;

-- M5. Read call metrics for a window (minutes, capped at 7 days)
CREATE OR REPLACE FUNCTION public.get_platform_db_call_metrics(p_window_minutes INTEGER DEFAULT 60)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
DECLARE
  v_window INTEGER := LEAST(10080, GREATEST(5, COALESCE(p_window_minutes, 60)));
  v_since TIMESTAMPTZ;
  v_step INTERVAL;
  v_result JSONB;
BEGIN
  IF NOT public.has_platform_permission('monitoring.read') THEN
    RAISE EXCEPTION 'Platform permission required to view monitoring' USING ERRCODE = '42501';
  END IF;

  v_since := date_trunc('minute', now()) - make_interval(mins => v_window - 1);
  -- Keep the timeline at ~60–170 points regardless of window size
  v_step := CASE
    WHEN v_window <= 180 THEN INTERVAL '1 minute'
    WHEN v_window <= 1440 THEN INTERVAL '15 minutes'
    ELSE INTERVAL '1 hour'
  END;

  WITH scoped AS (
    SELECT * FROM public.platform_db_call_metrics WHERE bucket >= v_since
  ),
  slots AS (
    SELECT generate_series(
      date_bin(v_step, v_since, TIMESTAMPTZ '2000-01-01'),
      date_trunc('minute', now()),
      v_step
    ) AS slot
  ),
  timeline AS (
    SELECT
      s.slot,
      COALESCE(sum(m.calls), 0)::bigint AS calls,
      COALESCE(sum(m.errors), 0)::bigint AS errors,
      COALESCE(sum(m.slow_calls), 0)::bigint AS slow
    FROM slots s
    LEFT JOIN scoped m ON date_bin(v_step, m.bucket, TIMESTAMPTZ '2000-01-01') = s.slot
    GROUP BY s.slot
    ORDER BY s.slot
  ),
  totals AS (
    SELECT
      COALESCE(sum(calls), 0)::bigint AS calls,
      COALESCE(sum(errors), 0)::bigint AS errors,
      COALESCE(sum(slow_calls), 0)::bigint AS slow,
      COALESCE(sum(total_ms), 0)::bigint AS total_ms,
      COALESCE(max(max_ms), 0)::int AS max_ms
    FROM scoped
  ),
  flows AS (
    SELECT source, target_kind, target,
      sum(calls)::bigint AS calls, sum(errors)::bigint AS errors,
      sum(slow_calls)::bigint AS slow, sum(total_ms)::bigint AS total_ms, max(max_ms)::int AS max_ms
    FROM scoped
    GROUP BY source, target_kind, target
  ),
  targets AS (
    SELECT target_kind, target,
      sum(calls)::bigint AS calls, sum(errors)::bigint AS errors,
      sum(slow)::bigint AS slow, sum(total_ms)::bigint AS total_ms, max(max_ms)::int AS max_ms,
      count(DISTINCT source)::int AS sources
    FROM flows
    GROUP BY target_kind, target
    ORDER BY sum(calls) DESC
    LIMIT 40
  ),
  methods AS (
    SELECT method, sum(calls)::bigint AS calls
    FROM scoped GROUP BY method ORDER BY 2 DESC
  )
  SELECT jsonb_build_object(
    'windowMinutes', v_window,
    'stepMinutes', (extract(epoch FROM v_step) / 60)::int,
    'since', v_since,
    'lastRecordedAt', (SELECT max(bucket) FROM public.platform_db_call_metrics),
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'timeline', COALESCE((SELECT jsonb_agg(jsonb_build_object('t', slot, 'calls', calls, 'errors', errors, 'slow', slow)) FROM timeline), '[]'::jsonb),
    'flows', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'source', source, 'targetKind', target_kind, 'target', target,
        'calls', calls, 'errors', errors, 'slow', slow, 'totalMs', total_ms, 'maxMs', max_ms))
      FROM flows), '[]'::jsonb),
    'targets', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'targetKind', target_kind, 'target', target, 'calls', calls, 'errors', errors,
        'slow', slow, 'totalMs', total_ms, 'maxMs', max_ms, 'sources', sources))
      FROM targets), '[]'::jsonb),
    'methods', COALESCE((SELECT jsonb_agg(jsonb_build_object('method', method, 'calls', calls)) FROM methods), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_db_call_metrics(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_db_call_metrics(INTEGER) TO authenticated;

-- M6. Postgres-native health. Exposes only counts, sizes and normalized statement
--    text (pg_stat_statements replaces literals with $n); never session query text.
CREATE OR REPLACE FUNCTION public.get_platform_db_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
DECLARE
  v_result JSONB;
  v_statements JSONB := NULL;
  v_pgss_schema TEXT;
BEGIN
  IF NOT public.has_platform_permission('monitoring.read') THEN
    RAISE EXCEPTION 'Platform permission required to view monitoring' USING ERRCODE = '42501';
  END IF;

  SELECT n.nspname INTO v_pgss_schema
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'pg_stat_statements';

  IF v_pgss_schema IS NOT NULL THEN
    BEGIN
      EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (
          SELECT
            left(regexp_replace(query, '\s+', ' ', 'g'), 240) AS query,
            calls::bigint AS calls,
            round(total_exec_time::numeric, 1) AS "totalMs",
            round(mean_exec_time::numeric, 2) AS "meanMs",
            rows::bigint AS rows
          FROM %I.pg_stat_statements
          WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
            AND query !~* '^\s*(begin|commit|rollback|set |show |reset |deallocate|discard)'
            AND query !~* 'pg_stat_statements|pg_stat_activity|get_platform_db_health'
          ORDER BY calls DESC
          LIMIT 15
        ) s
      $q$, v_pgss_schema) INTO v_statements;
    EXCEPTION WHEN OTHERS THEN
      v_statements := NULL;
    END;
  END IF;

  SELECT jsonb_build_object(
    'collectedAt', now(),
    'databaseSizeBytes', pg_database_size(current_database()),
    'serverVersion', current_setting('server_version'),
    'maxConnections', current_setting('max_connections')::int,
    'statsResetAt', (SELECT stats_reset FROM pg_stat_database WHERE datname = current_database()),
    'database', (
      SELECT jsonb_build_object(
        'commits', xact_commit,
        'rollbacks', xact_rollback,
        'deadlocks', deadlocks,
        'tempBytes', temp_bytes,
        'rowsReturned', tup_returned,
        'rowsFetched', tup_fetched,
        'rowsInserted', tup_inserted,
        'rowsUpdated', tup_updated,
        'rowsDeleted', tup_deleted,
        'cacheHitPct', CASE WHEN blks_hit + blks_read = 0 THEN NULL
                            ELSE round(100.0 * blks_hit / (blks_hit + blks_read), 2) END
      )
      FROM pg_stat_database WHERE datname = current_database()
    ),
    'connections', COALESCE((
      SELECT jsonb_agg(c ORDER BY c.total DESC) FROM (
        SELECT
          COALESCE(NULLIF(application_name, ''), CASE WHEN backend_type = 'client backend' THEN 'unnamed client' ELSE backend_type END) AS application,
          count(*)::int AS total,
          count(*) FILTER (WHERE state = 'active')::int AS active,
          count(*) FILTER (WHERE state = 'idle')::int AS idle,
          count(*) FILTER (WHERE state LIKE 'idle in transaction%')::int AS "idleInTransaction",
          COALESCE(round(max(extract(epoch FROM (now() - query_start))) FILTER (WHERE state = 'active')::numeric, 1), 0) AS "longestActiveSec"
        FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()
        GROUP BY 1
      ) c
    ), '[]'::jsonb),
    'tables', COALESCE((
      SELECT jsonb_agg(t ORDER BY t."sizeBytes" DESC) FROM (
        SELECT
          relname AS name,
          n_live_tup::bigint AS "liveRows",
          n_dead_tup::bigint AS "deadRows",
          pg_total_relation_size(relid) AS "sizeBytes",
          COALESCE(seq_scan, 0)::bigint AS "seqScans",
          COALESCE(idx_scan, 0)::bigint AS "indexScans",
          n_tup_ins::bigint AS inserts,
          n_tup_upd::bigint AS updates,
          n_tup_del::bigint AS deletes,
          GREATEST(last_autovacuum, last_vacuum) AS "lastVacuum"
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 40
      ) t
    ), '[]'::jsonb),
    'statements', v_statements
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_db_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_db_health() TO authenticated;

-- M7. Settings read / write
CREATE OR REPLACE FUNCTION public.get_platform_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
BEGIN
  IF NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Platform permission required' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'monitoring', (SELECT value FROM public.platform_settings WHERE key = 'monitoring'),
    'monitoringUpdatedAt', (SELECT updated_at FROM public.platform_settings WHERE key = 'monitoring'),
    'monitoringUpdatedBy', (
      SELECT u.email FROM public.platform_settings s
      LEFT JOIN auth.users u ON u.id = s.updated_by
      WHERE s.key = 'monitoring'
    ),
    'canManage', public.has_platform_permission('settings.manage')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_settings() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_platform_monitoring_settings(
  p_capture_enabled BOOLEAN,
  p_sample_rate INTEGER,
  p_slow_call_ms INTEGER,
  p_retention_days INTEGER,
  p_error_rate_alert_pct INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF NOT public.has_platform_permission('settings.manage') THEN
    RAISE EXCEPTION 'Platform permission required to change settings' USING ERRCODE = '42501';
  END IF;

  IF p_sample_rate NOT BETWEEN 1 AND 100
     OR p_slow_call_ms NOT BETWEEN 50 AND 30000
     OR p_retention_days NOT BETWEEN 1 AND 90
     OR p_error_rate_alert_pct NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Monitoring setting out of range' USING ERRCODE = '22023';
  END IF;

  SELECT value INTO v_old FROM public.platform_settings WHERE key = 'monitoring';

  v_new := jsonb_build_object(
    'captureEnabled', COALESCE(p_capture_enabled, true),
    'sampleRate', p_sample_rate,
    'slowCallMs', p_slow_call_ms,
    'retentionDays', p_retention_days,
    'errorRateAlertPct', p_error_rate_alert_pct
  );

  INSERT INTO public.platform_settings (key, value, updated_at, updated_by)
  VALUES ('monitoring', v_new, now(), auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = auth.uid();

  PERFORM public.record_platform_audit_log(
    'platform.settings.monitoring_updated',
    'platform_settings',
    NULL,
    'Monitoring settings changed.',
    jsonb_build_object('before', v_old, 'after', v_new)
  );

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.update_platform_monitoring_settings(BOOLEAN, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_platform_monitoring_settings(BOOLEAN, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- M8. Admin team (read-only listing for the settings page)
CREATE OR REPLACE FUNCTION public.list_platform_admins()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
BEGIN
  IF NOT public.has_platform_permission('settings.manage') THEN
    RAISE EXCEPTION 'Platform permission required to view administrators' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'userId', pr.user_id,
      'email', u.email,
      'role', pr.role,
      'isActive', pr.is_active,
      'grantedAt', pr.created_at,
      'lastSignInAt', u.last_sign_in_at
    ) ORDER BY pr.created_at)
    FROM public.platform_roles pr
    LEFT JOIN auth.users u ON u.id = pr.user_id
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_platform_admins() TO authenticated;

-- -----------------------------------------------------------------------------
-- 20261028010000_function_acl_and_search_path.sql
-- [catch-up] Already applied (recorded live as 20261028160727); re-run to cover the functions created above.
-- -----------------------------------------------------------------------------

-- ==============================================================================
-- Function ACL hardening + fixed search_path (Supabase security advisors)
-- ==============================================================================
-- Privileges and function settings only: no function bodies, tables or
-- policies change. Every statement is idempotent, so this file can be re-run.
--
-- Deliberately NOT revoked from anon:
--   is_workspace_member, has_permission, get_workspace_from_event,
--   get_workspace_from_event_person
--   These are called from RLS policies declared TO public (events, people,
--   registrations, workspaces, ...). Postgres checks EXECUTE on functions in a
--   policy for the querying role, so revoking them from anon makes every
--   anonymous read of those tables fail with "permission denied for function"
--   (verified against the live database in a rolled-back transaction). Both
--   membership helpers key on auth.uid(), so for anon they always return false.
--   Removing the anon grant needs the policies re-scoped TO authenticated first.
--
--   submit_event_registration, get_event_ticket_availability, process_check_in
--   Public registration page, public ticket list and the token-based volunteer
--   scanner. Each validates its own inputs (published/enabled event, scanner
--   session token, zone/event match) before touching data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Background job claimers: service_role only (src/services/integrations/jobQueue.ts
--    calls them through createAdminClient). Mirrors 20261019000002.
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.claim_integration_jobs(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_integration_jobs(INTEGER, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_integration_jobs_for_registration(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_integration_jobs_for_registration(UUID, TEXT)
  TO service_role;

-- ------------------------------------------------------------------------------
-- 2. Auth trigger: never callable over the API. Trigger execution does not need
--    EXECUTE for the inserting role (it is checked only at CREATE TRIGGER).
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user()
  TO service_role;

-- ------------------------------------------------------------------------------
-- 3. Signed-in organizer RPCs: drop anon, keep authenticated.
--    import_attendees      -> src/services/attendeeImport.ts (user session)
--    redeem_invitation     -> src/app/api/invitations/redeem/route.ts (user session)
--    get_workspace_user_id_by_email -> not called by the app; checks
--                             volunteers.manage itself.
--    All three already reject callers without auth.uid().
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.import_attendees(UUID, UUID, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_attendees(UUID, UUID, TEXT, JSONB)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_invitation(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_invitation(UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_workspace_user_id_by_email(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_user_id_by_email(UUID, TEXT)
  TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. Fixed search_path for functions flagged function_search_path_mutable.
--    All of them reference tables schema-qualified (public.*) or only use
--    pg_catalog built-ins, so pinning to public changes no lookups.
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.get_workspace_from_event(UUID) SET search_path = public;
ALTER FUNCTION public.get_workspace_from_event_person(UUID) SET search_path = public;
ALTER FUNCTION public.check_event_person_workspace_match() SET search_path = public;
ALTER FUNCTION public.check_event_speaker_type() SET search_path = public;
ALTER FUNCTION public.check_registration_attendee() SET search_path = public;
ALTER FUNCTION public.check_registration_distance_category() SET search_path = public;
ALTER FUNCTION public.check_zone_event_match() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_user_preferences_updated_at() SET search_path = public;
ALTER FUNCTION public.update_access_rules_updated_at() SET search_path = public;
ALTER FUNCTION public.update_access_zones_updated_at() SET search_path = public;
ALTER FUNCTION public.update_qr_credentials_updated_at() SET search_path = public;
ALTER FUNCTION public.update_walkathon_distance_categories_updated_at() SET search_path = public;
ALTER FUNCTION public.update_walkathon_participants_modified_at() SET search_path = public;

-- -----------------------------------------------------------------------------
-- Clean-up
-- -----------------------------------------------------------------------------

-- 20261014 created a 6-argument version; 20261020 added the 7-argument one the app calls.
DROP FUNCTION IF EXISTS public.create_organizer_verification_challenge(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT
);

-- Record the migrations so `supabase db push` does not try to run them again.
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20261013000000', 'workspace_subscriptions'),
  ('20261014000000', 'auth_registration_hardening'),
  ('20261017000000', 'platform_admin_foundation'),
  ('20261018000000', 'platform_customer_read'),
  ('20261019000000', 'platform_activity_events'),
  ('20261019000001', 'fix_event_write_rls'),
  ('20261019000002', 'integration_jobs_rpc_acl'),
  ('20261019000003', 'event_flyer_storage_owner_policies'),
  ('20261020000000', 'security_remediation_suite'),
  ('20261023000000', 'master_admin_portal'),
  ('20261028000000', 'super_admin_live'),
  ('20261028010000', 'function_acl_and_search_path')
ON CONFLICT (version) DO NOTHING;

COMMIT;
