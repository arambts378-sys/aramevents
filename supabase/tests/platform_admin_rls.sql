-- Local-only platform role and audit-log RLS verification.
-- Run against a disposable local Supabase database; never against production.
--   psql "******127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/platform_admin_rls.sql
--
-- Expected: NOTICE 'platform admin RLS: ALL CHECKS PASSED'.

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at)
VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'platform-owner@test.local', '{"full_name":"Workspace Owner"}', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-8000-0000000000a2', 'platform-admin@test.local', '{"full_name":"Workspace Admin"}', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-8000-0000000000a3', 'platform-support@test.local', '{"full_name":"Platform Support"}', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-8000-0000000000a4', 'platform-super@test.local', '{"full_name":"Platform Super Admin"}', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-8000-0000000000a5', 'platform-member@test.local', '{"full_name":"Unassigned User"}', 'authenticated', 'authenticated', now());

DO $$
DECLARE
  owner_workspace UUID;
  admin_workspace UUID;
  super_workspace UUID;
  admin_role_id UUID;
BEGIN
  SELECT id INTO owner_workspace FROM public.workspaces WHERE owner_id = '00000000-0000-4000-8000-0000000000a1' LIMIT 1;
  SELECT id INTO admin_workspace FROM public.workspaces WHERE owner_id = '00000000-0000-4000-8000-0000000000a2' LIMIT 1;
  SELECT id INTO super_workspace FROM public.workspaces WHERE owner_id = '00000000-0000-4000-8000-0000000000a4' LIMIT 1;
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
  VALUES (owner_workspace, '00000000-0000-4000-8000-0000000000a2', admin_role_id);
  INSERT INTO public.workspace_subscriptions (workspace_id, plan_id, status)
  VALUES (admin_workspace, 'professional', 'active');
  INSERT INTO public.events (
    workspace_id, created_by, name, slug, type, format, status,
    start_date, start_time, end_date, end_time, timezone
  )
  VALUES (
    super_workspace, '00000000-0000-4000-8000-0000000000a4', 'Super Workspace Event',
    'super-workspace-event', 'Conference', 'In-person', 'published',
    '2026-12-01', '09:00', '2026-12-01', '17:00', 'Asia/Kolkata'
  );

  INSERT INTO public.platform_roles (user_id, role)
  VALUES ('00000000-0000-4000-8000-0000000000a3', 'support');

  INSERT INTO public.platform_audit_logs (actor_user_id, action, target_type, target_id)
  VALUES ('00000000-0000-4000-8000-0000000000a4', 'test.fixture', 'test', 'append-only');

  PERFORM set_config('test.owner_workspace', owner_workspace::text, true);
  PERFORM set_config('test.admin_workspace', admin_workspace::text, true);
  PERFORM set_config('test.super_workspace', super_workspace::text, true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(uid UUID) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$ LANGUAGE plpgsql;

-- The approved service-role RPC provisions once and remains idempotent.
DO $$
DECLARE first_result BOOLEAN; repeat_result BOOLEAN; audit_count INT;
BEGIN
  EXECUTE 'SET LOCAL ROLE service_role';
  first_result := public.provision_initial_super_admin(
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a4'
  );
  repeat_result := public.provision_initial_super_admin(
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a4'
  );
  RESET ROLE;

  IF NOT first_result OR repeat_result THEN
    RAISE EXCEPTION 'FAIL: provisioning did not behave idempotently';
  END IF;

  SELECT count(*) INTO audit_count
  FROM public.platform_audit_logs
  WHERE action = 'platform.super_admin.provisioned'
    AND target_id = '00000000-0000-4000-8000-0000000000a4';
  IF audit_count <> 1 THEN RAISE EXCEPTION 'FAIL: provisioning audit record missing or duplicated'; END IF;
END $$;

-- Only Super Admin can list customers; directory search, filtering, sorting,
-- and pagination execute in the database with bounded page sizes.
DO $$
DECLARE directory JSONB; detail JSONB; exact_match JSONB; plan_match JSONB; oversized_page JSONB;
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a4');
  directory := public.list_platform_customers(
    NULL, NULL, 'name', 'asc', 1, 2
  );
  IF jsonb_array_length(directory->'items') <> 2 THEN RAISE EXCEPTION 'FAIL: directory page was not bounded'; END IF;
  IF (directory->>'totalCount')::INT <> 5 THEN RAISE EXCEPTION 'FAIL: directory total count is incorrect'; END IF;
  IF (directory->'summary'->>'organizationCount')::INT <> 5 THEN RAISE EXCEPTION 'FAIL: summary organization count is incorrect'; END IF;
  IF (directory->'summary'->>'eventCount')::INT <> 1 THEN RAISE EXCEPTION 'FAIL: summary event count is incorrect'; END IF;

  exact_match := public.list_platform_customers(current_setting('test.super_workspace'), NULL, 'created_at', 'desc', 1, 20);
  IF (exact_match->>'totalCount')::INT <> 1 THEN RAISE EXCEPTION 'FAIL: exact workspace ID search failed'; END IF;

  plan_match := public.list_platform_customers(NULL, 'professional', 'event_count', 'desc', 1, 20);
  IF (plan_match->>'totalCount')::INT <> 1 THEN RAISE EXCEPTION 'FAIL: plan filter failed'; END IF;

  oversized_page := public.list_platform_customers(NULL, NULL, 'untrusted', 'sideways', 1000000, 1000000);
  IF (oversized_page->>'pageSize')::INT <> 100 THEN RAISE EXCEPTION 'FAIL: page size was not capped'; END IF;
  IF (oversized_page->>'page')::INT <> 10000 THEN RAISE EXCEPTION 'FAIL: page number was not capped'; END IF;

  detail := public.get_platform_customer_detail(current_setting('test.super_workspace')::UUID, 1, 1, 20);
  IF detail IS NULL THEN RAISE EXCEPTION 'FAIL: Super Admin could not retrieve Customer 360'; END IF;
  IF detail->'organization'->>'hasSubscription' <> 'false' THEN RAISE EXCEPTION 'FAIL: missing subscription was not distinguished'; END IF;
  IF detail->'organization'->>'ownerName' IS NULL THEN RAISE EXCEPTION 'FAIL: owner profile did not resolve'; END IF;
  IF jsonb_array_length(detail->'events') <> 1 THEN RAISE EXCEPTION 'FAIL: workspace events were not returned'; END IF;
  RESET ROLE;
END $$;

-- A different target cannot become a second Super Admin; a support assignment cannot be replaced.
DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE service_role';
  BEGIN
    PERFORM public.provision_initial_super_admin(
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000a5'
    );
    RAISE EXCEPTION 'FAIL: second Super Admin was provisioned';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Initial Super Admin has already been provisioned' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.provision_initial_super_admin(
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000a3'
    );
    RAISE EXCEPTION 'FAIL: existing support role was replaced';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Target already has a conflicting platform role' THEN RAISE; END IF;
  END;
  RESET ROLE;
END $$;

-- No claims means unauthenticated and must fail closed.
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'FAIL: unauthenticated request received platform access';
  END IF;
  RESET ROLE;
END $$;

-- Workspace owners/admins and ordinary users receive no implicit platform access.
DO $$
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
  IF public.has_platform_permission('console.view') THEN RAISE EXCEPTION 'FAIL: workspace owner got platform access'; END IF;
  RESET ROLE;

  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a2');
  IF public.has_platform_permission('console.view') THEN RAISE EXCEPTION 'FAIL: workspace admin got platform access'; END IF;
  RESET ROLE;

  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a5');
  IF public.has_platform_permission('console.view') THEN RAISE EXCEPTION 'FAIL: unassigned user got platform access'; END IF;
  BEGIN
    PERFORM public.get_platform_customer_detail(current_setting('test.super_workspace')::UUID, 1, 1, 20);
    RAISE EXCEPTION 'FAIL: ordinary user retrieved Customer 360';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- Support has only the explicitly seeded console.view permission.
DO $$
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a3');
  IF NOT public.has_platform_permission('console.view') THEN RAISE EXCEPTION 'FAIL: support cannot view console'; END IF;
  IF public.has_platform_permission('customers.read') THEN RAISE EXCEPTION 'FAIL: support has no explicit customer permission'; END IF;
  IF public.has_platform_permission('console.customers.read') THEN RAISE EXCEPTION 'FAIL: support got an ungranted permission'; END IF;
  BEGIN
    PERFORM public.list_platform_customers(NULL, NULL, 'created_at', 'desc', 1, 20);
    RAISE EXCEPTION 'FAIL: support retrieved customer directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- Super Admin gets platform permissions without changing workspace memberships.
DO $$
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a4');
  IF NOT public.has_platform_permission('console.view') THEN RAISE EXCEPTION 'FAIL: Super Admin denied console access'; END IF;
  IF NOT public.has_platform_permission('console.audit.read') THEN RAISE EXCEPTION 'FAIL: Super Admin denied platform permission'; END IF;
  RESET ROLE;
END $$;

-- Authenticated browser users cannot assign or mutate platform roles.
DO $$
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a5');
  BEGIN
    INSERT INTO public.platform_roles (user_id, role) VALUES ('00000000-0000-4000-8000-0000000000a5', 'super_admin');
    RAISE EXCEPTION 'FAIL: browser inserted platform role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.platform_roles SET role = 'super_admin' WHERE user_id = '00000000-0000-4000-8000-0000000000a3';
    RAISE EXCEPTION 'FAIL: browser updated platform role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.platform_roles WHERE user_id = '00000000-0000-4000-8000-0000000000a3';
    RAISE EXCEPTION 'FAIL: browser deleted platform role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF has_function_privilege('authenticated', 'public.provision_initial_super_admin(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated users can invoke the provisioning function';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.provision_initial_super_admin(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service role cannot invoke the provisioning function';
  END IF;

  -- The audit log has no ordinary-client insert, update, or delete path.
  BEGIN
    INSERT INTO public.platform_audit_logs (actor_user_id, action) VALUES ('00000000-0000-4000-8000-0000000000a5', 'test.browser');
    RAISE EXCEPTION 'FAIL: browser inserted audit record';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.platform_audit_logs SET action = 'tampered' WHERE target_id = 'append-only';
    RAISE EXCEPTION 'FAIL: browser updated audit record';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.platform_audit_logs WHERE target_id = 'append-only';
    RAISE EXCEPTION 'FAIL: browser deleted audit record';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

DO $$ BEGIN RAISE NOTICE 'platform admin RLS: ALL CHECKS PASSED'; END $$;
ROLLBACK;
