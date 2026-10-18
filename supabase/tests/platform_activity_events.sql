-- Local-only activity authorization and trigger verification.
-- Apply migrations through 20261019000000_platform_activity_events.sql first.
-- Run only against a disposable local Supabase/Postgres database. This test rolls back.
--
-- Expected: NOTICE 'platform activity: ALL CHECKS PASSED'.

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'activity-owner@test.local', '{"full_name":"Activity Owner"}', 'authenticated', 'authenticated', now()),
  ('30000000-0000-4000-8000-000000000002', 'activity-support@test.local', '{"full_name":"Activity Support"}', 'authenticated', 'authenticated', now()),
  ('30000000-0000-4000-8000-000000000003', 'activity-super@test.local', '{"full_name":"Activity Super"}', 'authenticated', 'authenticated', now());

INSERT INTO public.platform_roles (user_id, role)
VALUES
  ('30000000-0000-4000-8000-000000000002', 'support'),
  ('30000000-0000-4000-8000-000000000003', 'super_admin');

CREATE OR REPLACE FUNCTION pg_temp.as_user(uid UUID) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$ LANGUAGE plpgsql;

DO $$
DECLARE
  owner_workspace UUID;
  event_id UUID;
  listed JSONB;
BEGIN
  SELECT id INTO owner_workspace
  FROM public.workspaces
  WHERE owner_id = '30000000-0000-4000-8000-000000000001'
  LIMIT 1;
  IF owner_workspace IS NULL THEN RAISE EXCEPTION 'Fixture workspace was not provisioned'; END IF;
  PERFORM set_config('test.activity_workspace', owner_workspace::text, true);

  PERFORM pg_temp.as_user('30000000-0000-4000-8000-000000000001');
  IF public.has_platform_permission('activity.read') THEN
    RAISE EXCEPTION 'Workspace owner received platform activity access';
  END IF;
  BEGIN
    PERFORM public.list_platform_activity(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 25);
    RAISE EXCEPTION 'Workspace owner queried platform activity';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM (SELECT count(*) FROM public.platform_activity_events);
    RAISE EXCEPTION 'Ordinary authenticated user selected activity rows directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.platform_activity_events SET message = 'modified';
    RAISE EXCEPTION 'Ordinary authenticated user updated activity rows';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.platform_activity_events;
    RAISE EXCEPTION 'Ordinary authenticated user deleted activity rows';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.platform_activity_events (category, action, outcome, severity, message)
    VALUES ('event', 'event.created', 'success', 'info', 'forged');
    RAISE EXCEPTION 'Ordinary authenticated user inserted activity rows';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  PERFORM pg_temp.as_user('30000000-0000-4000-8000-000000000001');
  INSERT INTO public.events (
    workspace_id, created_by, name, slug, type, format, status,
    start_date, start_time, end_date, end_time, timezone
  )
  VALUES (
    owner_workspace, '30000000-0000-4000-8000-000000000001',
    'Activity Test Event', 'activity-test-event', 'Conference', 'In-person', 'draft',
    '2026-12-01', '09:00', '2026-12-01', '17:00', 'Asia/Kolkata'
  )
  RETURNING id INTO event_id;
  UPDATE public.events SET status = 'published' WHERE id = event_id;
  RESET ROLE;

  PERFORM pg_temp.as_user('30000000-0000-4000-8000-000000000003');
  SELECT public.list_platform_activity(
    owner_workspace, 'event', NULL, 'success', NULL, NULL, NULL, NULL, NULL, 1, 25
  ) INTO listed;
  IF (listed->>'totalCount')::INT <> 2 THEN
    RAISE EXCEPTION 'Expected event creation and publishing activity';
  END IF;
  IF listed->'items'->0->>'action' <> 'event.published' THEN
    RAISE EXCEPTION 'Expected newest activity to be event.published';
  END IF;
  IF listed->'items'->0->>'workspaceId' <> owner_workspace::text THEN
    RAISE EXCEPTION 'Workspace activity scope was not retained';
  END IF;
  RESET ROLE;

  PERFORM pg_temp.as_user('30000000-0000-4000-8000-000000000002');
  IF NOT public.has_platform_permission('console.view') THEN
    RAISE EXCEPTION 'Support lost its explicit console permission';
  END IF;
  IF public.has_platform_permission('activity.read') THEN
    RAISE EXCEPTION 'Support received an ungranted activity permission';
  END IF;
  BEGIN
    PERFORM public.list_platform_activity(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 25);
    RAISE EXCEPTION 'Support queried platform activity without permission';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  BEGIN
    UPDATE public.platform_activity_events
    SET message = 'modified'
    WHERE action = 'event.created';
    RAISE EXCEPTION 'Activity log update was not append-only';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Platform activity events are append-only' THEN RAISE; END IF;
  END;
  IF EXISTS (
    SELECT 1 FROM public.platform_activity_events
    WHERE workspace_id = owner_workspace AND message = 'modified'
  ) THEN
    RAISE EXCEPTION 'Activity mutation changed persisted data';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'platform activity: ALL CHECKS PASSED'; END $$;
ROLLBACK;
