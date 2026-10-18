-- Local-only test for permission-checked Super Admin customer read functions.
-- Apply all migrations first, then run on a disposable local database:
--   psql "******127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/platform_customer_read.sql
-- Never run against production. The transaction rolls back all fixture data.
--
-- Expected: NOTICE 'platform customer read: ALL CHECKS PASSED'.

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'customer-owner@test.local', '{"full_name":"Owner One"}', 'authenticated', 'authenticated', now()),
  ('10000000-0000-4000-8000-000000000002', 'customer-admin@test.local', '{"full_name":"Admin Two"}', 'authenticated', 'authenticated', now()),
  ('10000000-0000-4000-8000-000000000003', 'customer-support@test.local', '{"full_name":"Support Three"}', 'authenticated', 'authenticated', now()),
  ('10000000-0000-4000-8000-000000000004', 'customer-super@test.local', '{"full_name":"Super Four"}', 'authenticated', 'authenticated', now());

DO $$
DECLARE
  owner_workspace UUID;
  admin_workspace UUID;
  support_workspace UUID;
  super_workspace UUID;
  admin_role_id UUID;
BEGIN
  SELECT id INTO owner_workspace FROM public.workspaces WHERE owner_id = '10000000-0000-4000-8000-000000000001' LIMIT 1;
  SELECT id INTO admin_workspace FROM public.workspaces WHERE owner_id = '10000000-0000-4000-8000-000000000002' LIMIT 1;
  SELECT id INTO support_workspace FROM public.workspaces WHERE owner_id = '10000000-0000-4000-8000-000000000003' LIMIT 1;
  SELECT id INTO super_workspace FROM public.workspaces WHERE owner_id = '10000000-0000-4000-8000-000000000004' LIMIT 1;
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
  VALUES
    (owner_workspace, '10000000-0000-4000-8000-000000000002', admin_role_id),
    (owner_workspace, '10000000-0000-4000-8000-000000000003', admin_role_id);
  INSERT INTO public.workspace_subscriptions (workspace_id, plan_id, status)
  VALUES (admin_workspace, 'professional', 'active');
  INSERT INTO public.events (
    workspace_id, created_by, name, slug, type, format, status,
    start_date, start_time, end_date, end_time, timezone
  )
  VALUES (
    super_workspace, '10000000-0000-4000-8000-000000000004', 'Super Workspace Event',
    'super-workspace-event', 'Conference', 'In-person', 'published',
    '2026-12-01', '09:00', '2026-12-01', '17:00', 'Asia/Kolkata'
  );
  INSERT INTO public.platform_roles (user_id, role)
  VALUES
    ('10000000-0000-4000-8000-000000000003', 'support'),
    ('10000000-0000-4000-8000-000000000004', 'super_admin');

  PERFORM set_config('test.owner_workspace', owner_workspace::text, true);
  PERFORM set_config('test.admin_workspace', admin_workspace::text, true);
  PERFORM set_config('test.support_workspace', support_workspace::text, true);
  PERFORM set_config('test.super_workspace', super_workspace::text, true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(uid UUID) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$ LANGUAGE plpgsql;

-- Super Admin can query directory and Customer 360 with bounded database-side pages.
DO $$
DECLARE directory JSONB; second_page JSONB; exact_match JSONB; plan_match JSONB; detail JSONB; bounded JSONB;
BEGIN
  PERFORM pg_temp.as_user('10000000-0000-4000-8000-000000000004');

  directory := public.list_platform_customers(NULL, NULL, 'name', 'asc', 1, 2);
  IF jsonb_array_length(directory->'items') <> 2 THEN RAISE EXCEPTION 'FAIL: first directory page is not bounded'; END IF;
  IF (directory->>'totalCount')::INT <> 4 THEN RAISE EXCEPTION 'FAIL: directory count is wrong'; END IF;
  IF directory->'items'->0->>'name' <> 'Admin Two Workspace' THEN RAISE EXCEPTION 'FAIL: name sort is incorrect'; END IF;
  IF (directory->'summary'->>'organizationCount')::INT <> 4 THEN RAISE EXCEPTION 'FAIL: organization metric is wrong'; END IF;
  IF (directory->'summary'->>'eventCount')::INT <> 1 THEN RAISE EXCEPTION 'FAIL: event metric is wrong'; END IF;
  IF (directory->'summary'->>'activeSubscriptionCount')::INT <> 1 THEN RAISE EXCEPTION 'FAIL: active subscription metric is wrong'; END IF;

  second_page := public.list_platform_customers(NULL, NULL, 'created_at', 'desc', 2, 2);
  IF jsonb_array_length(second_page->'items') <> 2 THEN RAISE EXCEPTION 'FAIL: second directory page is incorrect'; END IF;

  exact_match := public.list_platform_customers(current_setting('test.super_workspace'), NULL, 'created_at', 'desc', 1, 20);
  IF (exact_match->>'totalCount')::INT <> 1 THEN RAISE EXCEPTION 'FAIL: exact workspace ID search failed'; END IF;
  plan_match := public.list_platform_customers(NULL, 'professional', 'event_count', 'desc', 1, 20);
  IF (plan_match->>'totalCount')::INT <> 1 THEN RAISE EXCEPTION 'FAIL: plan filter failed'; END IF;
  bounded := public.list_platform_customers(NULL, NULL, 'unknown', 'unknown', 1000000, 1000000);
  IF (bounded->>'pageSize')::INT <> 100 OR (bounded->>'page')::INT <> 10000 THEN
    RAISE EXCEPTION 'FAIL: directory bounds were not enforced';
  END IF;

  detail := public.get_platform_customer_detail(current_setting('test.super_workspace')::UUID, 1, 1, 20);
  IF detail IS NULL THEN RAISE EXCEPTION 'FAIL: Super Admin could not retrieve Customer 360'; END IF;
  IF detail->'organization'->>'hasSubscription' <> 'false' THEN RAISE EXCEPTION 'FAIL: missing subscription was not distinguished'; END IF;
  IF detail->'organization'->>'planId' <> 'free' THEN RAISE EXCEPTION 'FAIL: missing subscription default plan is incorrect'; END IF;
  IF detail->'organization'->>'ownerEmail' <> 'customer-super@test.local' THEN RAISE EXCEPTION 'FAIL: owner Auth email did not resolve'; END IF;
  IF jsonb_array_length(detail->'members') <> 1 THEN RAISE EXCEPTION 'FAIL: workspace members were not returned'; END IF;
  IF jsonb_array_length(detail->'events') <> 1 THEN RAISE EXCEPTION 'FAIL: workspace events were not returned'; END IF;
  RESET ROLE;
END $$;

-- Workspace owner/admin and support cannot use the cross-workspace RPC.
DO $$
BEGIN
  PERFORM pg_temp.as_user('10000000-0000-4000-8000-000000000001');
  IF public.has_platform_permission('customers.read') THEN RAISE EXCEPTION 'FAIL: owner has platform customer permission'; END IF;
  BEGIN
    PERFORM public.list_platform_customers(NULL, NULL, 'created_at', 'desc', 1, 20);
    RAISE EXCEPTION 'FAIL: owner retrieved directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  PERFORM pg_temp.as_user('10000000-0000-4000-8000-000000000002');
  IF public.has_platform_permission('customers.read') THEN RAISE EXCEPTION 'FAIL: workspace admin has platform customer permission'; END IF;
  BEGIN
    PERFORM public.get_platform_customer_detail(current_setting('test.super_workspace')::UUID, 1, 1, 20);
    RAISE EXCEPTION 'FAIL: workspace admin retrieved customer details';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  PERFORM pg_temp.as_user('10000000-0000-4000-8000-000000000003');
  IF NOT public.has_platform_permission('console.view') THEN RAISE EXCEPTION 'FAIL: support lost its explicit console permission'; END IF;
  IF public.has_platform_permission('customers.read') THEN RAISE EXCEPTION 'FAIL: support has an ungranted customer permission'; END IF;
  BEGIN
    PERFORM public.list_platform_customers(NULL, NULL, 'created_at', 'desc', 1, 20);
    RAISE EXCEPTION 'FAIL: support retrieved directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.list_platform_customers(NULL, NULL, 'created_at', 'desc', 1, 20);
    RAISE EXCEPTION 'FAIL: unauthenticated request retrieved customer directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- Unauthorized access does not reveal whether a workspace ID exists.
DO $$
DECLARE existing_error TEXT; missing_error TEXT;
BEGIN
  PERFORM pg_temp.as_user('10000000-0000-4000-8000-000000000003');
  BEGIN
    PERFORM public.get_platform_customer_detail(current_setting('test.super_workspace')::UUID, 1, 1, 20);
  EXCEPTION WHEN insufficient_privilege THEN existing_error := SQLSTATE;
  END;
  BEGIN
    PERFORM public.get_platform_customer_detail('ffffffff-ffff-4fff-8fff-ffffffffffff', 1, 1, 20);
  EXCEPTION WHEN insufficient_privilege THEN missing_error := SQLSTATE;
  END;
  RESET ROLE;
  IF existing_error IS NULL OR existing_error <> missing_error THEN
    RAISE EXCEPTION 'FAIL: unauthorized lookup reveals workspace existence';
  END IF;
END $$;

-- Direct browser access to customer tables remains denied.
DO $$
DECLARE visible_other_workspace_count INT;
BEGIN
  PERFORM pg_temp.as_user('10000000-0000-4000-8000-000000000004');
  SELECT count(*) INTO visible_other_workspace_count
  FROM public.workspaces
  WHERE id = current_setting('test.owner_workspace')::UUID;
  IF visible_other_workspace_count <> 0 THEN RAISE EXCEPTION 'FAIL: platform customer migration weakened workspace RLS'; END IF;
  RESET ROLE;
END $$;

DO $$ BEGIN RAISE NOTICE 'platform customer read: ALL CHECKS PASSED'; END $$;
ROLLBACK;
