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
