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
