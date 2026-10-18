-- Local-only RLS verification for event write permissions.
-- Run after all migrations on a disposable local database. Never run against production.
-- The transaction rolls back all fixture data.
--
-- Authenticated-role tests set Supabase JWT claims and use the `authenticated` role,
-- matching the database authorization context used by the Supabase Data API.
-- Expected: NOTICE 'events RLS: ALL CHECKS PASSED'.

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'events-owner@test.local', '{"full_name":"Events Owner"}', 'authenticated', 'authenticated'),
  ('20000000-0000-4000-8000-000000000002', 'events-viewer@test.local', '{"full_name":"Events Viewer"}', 'authenticated', 'authenticated'),
  ('20000000-0000-4000-8000-000000000003', 'events-admin@test.local', '{"full_name":"Events Admin"}', 'authenticated', 'authenticated'),
  ('20000000-0000-4000-8000-000000000004', 'events-readonly@test.local', '{"full_name":"Events Readonly"}', 'authenticated', 'authenticated'),
  ('20000000-0000-4000-8000-000000000005', 'events-no-permissions@test.local', '{"full_name":"Events No Permissions"}', 'authenticated', 'authenticated'),
  ('20000000-0000-4000-8000-000000000006', 'events-member@test.local', '{"full_name":"Events Member"}', 'authenticated', 'authenticated');

DO $$
DECLARE
  owner_workspace UUID;
  viewer_workspace UUID;
  admin_role_id UUID;
  member_role_id UUID;
  viewer_role_id UUID;
  readonly_role_id UUID;
  no_permissions_role_id UUID;
  events_read_permission_id UUID;
BEGIN
  SELECT id INTO owner_workspace
  FROM public.workspaces
  WHERE owner_id = '20000000-0000-4000-8000-000000000001';
  SELECT id INTO viewer_workspace
  FROM public.workspaces
  WHERE owner_id = '20000000-0000-4000-8000-000000000002';
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO member_role_id FROM public.roles WHERE name = 'member';
  SELECT id INTO viewer_role_id FROM public.roles WHERE name = 'viewer';
  SELECT id INTO events_read_permission_id FROM public.permissions WHERE name = 'events.read';

  INSERT INTO public.roles (name)
  VALUES ('test_events_readonly'), ('test_events_no_permissions');
  SELECT id INTO readonly_role_id FROM public.roles WHERE name = 'test_events_readonly';
  SELECT id INTO no_permissions_role_id FROM public.roles WHERE name = 'test_events_no_permissions';

  INSERT INTO public.role_permissions (role_id, permission_id)
  VALUES (readonly_role_id, events_read_permission_id);

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
  VALUES
    (owner_workspace, '20000000-0000-4000-8000-000000000002', viewer_role_id),
    (owner_workspace, '20000000-0000-4000-8000-000000000003', admin_role_id),
    (owner_workspace, '20000000-0000-4000-8000-000000000004', readonly_role_id),
    (owner_workspace, '20000000-0000-4000-8000-000000000005', no_permissions_role_id),
    (owner_workspace, '20000000-0000-4000-8000-000000000006', member_role_id);

  INSERT INTO public.events (
    workspace_id, created_by, name, slug, type, format, status,
    start_date, start_time, end_date, end_time, timezone
  )
  VALUES
    (
      owner_workspace, '20000000-0000-4000-8000-000000000001', 'Owner Workspace Event',
      'rls-test-event', 'Conference', 'In-person', 'draft',
      '2026-12-01', '09:00', '2026-12-01', '17:00', 'Asia/Kolkata'
    ),
    (
      viewer_workspace, '20000000-0000-4000-8000-000000000002', 'Viewer Workspace Event',
      'viewer-owned-event', 'Conference', 'In-person', 'draft',
      '2026-12-02', '09:00', '2026-12-02', '17:00', 'Asia/Kolkata'
    );

  PERFORM set_config('test.owner_workspace', owner_workspace::text, true);
  PERFORM set_config('test.viewer_workspace', viewer_workspace::text, true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(uid UUID) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.as_anon() RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
END $$ LANGUAGE plpgsql;

-- A viewer has read access in a workspace they belong to, but no event write permissions.
DO $$
DECLARE
  visible_events INT;
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000002');
  IF NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.read')
     OR public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.create')
     OR public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.update')
     OR public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.delete') THEN
    RAISE EXCEPTION 'FAIL: viewer permission mapping is incorrect';
  END IF;

  SELECT count(*) INTO visible_events FROM public.events WHERE slug = 'rls-test-event';
  IF visible_events <> 1 THEN RAISE EXCEPTION 'FAIL: viewer lost intended event read access'; END IF;

  BEGIN
    INSERT INTO public.events (
      workspace_id, created_by, name, slug, type, format, status,
      start_date, start_time, end_date, end_time, timezone
    )
    VALUES (
      current_setting('test.owner_workspace')::UUID,
      '20000000-0000-4000-8000-000000000002', 'Viewer Event', 'viewer-event',
      'Conference', 'In-person', 'draft', '2026-12-03', '09:00',
      '2026-12-03', '17:00', 'Asia/Kolkata'
    );
    RAISE EXCEPTION 'FAIL: viewer inserted an event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.events SET name = 'Viewer Updated Event' WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: viewer updated an event'; END IF;

  DELETE FROM public.events WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: viewer deleted an event'; END IF;
  RESET ROLE;
END $$;

-- A role with read-only event permission keeps read access and cannot write.
DO $$
DECLARE
  visible_events INT;
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000004');
  SELECT count(*) INTO visible_events FROM public.events WHERE slug = 'rls-test-event';
  IF visible_events <> 1 THEN RAISE EXCEPTION 'FAIL: read-only role lost intended read access'; END IF;

  BEGIN
    INSERT INTO public.events (
      workspace_id, created_by, name, slug, type, format, status,
      start_date, start_time, end_date, end_time, timezone
    )
    VALUES (
      current_setting('test.owner_workspace')::UUID,
      '20000000-0000-4000-8000-000000000004', 'Readonly Event', 'readonly-event',
      'Conference', 'In-person', 'draft', '2026-12-04', '09:00',
      '2026-12-04', '17:00', 'Asia/Kolkata'
    );
    RAISE EXCEPTION 'FAIL: read-only role inserted an event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.events SET name = 'Readonly Updated Event' WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: read-only role updated an event'; END IF;

  DELETE FROM public.events WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: read-only role deleted an event'; END IF;
  RESET ROLE;
END $$;

-- The existing read policy intentionally allows workspace members to read events.
-- A member with no event write permissions must still be denied all event writes.
DO $$
DECLARE
  visible_events INT;
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000005');
  SELECT count(*) INTO visible_events FROM public.events WHERE slug = 'rls-test-event';
  IF visible_events <> 1 THEN RAISE EXCEPTION 'FAIL: membership-based event read access changed'; END IF;

  BEGIN
    INSERT INTO public.events (
      workspace_id, created_by, name, slug, type, format, status,
      start_date, start_time, end_date, end_time, timezone
    )
    VALUES (
      current_setting('test.owner_workspace')::UUID,
      '20000000-0000-4000-8000-000000000005', 'Unprivileged Event', 'unprivileged-event',
      'Conference', 'In-person', 'draft', '2026-12-05', '09:00',
      '2026-12-05', '17:00', 'Asia/Kolkata'
    );
    RAISE EXCEPTION 'FAIL: role without event permissions inserted an event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.events SET name = 'Unprivileged Updated Event'
  WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: role without event permissions updated an event'; END IF;

  DELETE FROM public.events WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: role without event permissions deleted an event'; END IF;
  RESET ROLE;
END $$;

-- Anonymous requests cannot write events.
DO $$
BEGIN
  PERFORM pg_temp.as_anon();
  BEGIN
    INSERT INTO public.events (
      workspace_id, name, slug, type, format, status,
      start_date, start_time, end_date, end_time, timezone
    )
    VALUES (
      current_setting('test.owner_workspace')::UUID, 'Anonymous Event', 'anonymous-event',
      'Conference', 'In-person', 'draft', '2026-12-06', '09:00',
      '2026-12-06', '17:00', 'Asia/Kolkata'
    );
    RAISE EXCEPTION 'FAIL: anonymous user inserted an event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- Missing JWT subject means auth.uid() cannot authorize any event write.
DO $$
DECLARE
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000002');
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', true);

  BEGIN
    INSERT INTO public.events (
      workspace_id, created_by, name, slug, type, format, status,
      start_date, start_time, end_date, end_time, timezone
    )
    VALUES (
      current_setting('test.owner_workspace')::UUID,
      '20000000-0000-4000-8000-000000000002', 'Missing Subject Event', 'missing-subject-event',
      'Conference', 'In-person', 'draft', '2026-12-11', '09:00',
      '2026-12-11', '17:00', 'Asia/Kolkata'
    );
    RAISE EXCEPTION 'FAIL: request without a JWT subject inserted an event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.events SET name = 'Missing Subject Updated Event'
  WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: request without a JWT subject updated an event'; END IF;

  DELETE FROM public.events WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: request without a JWT subject deleted an event'; END IF;
  RESET ROLE;
END $$;

-- A malformed JWT subject must fail closed rather than authorize a write.
DO $$
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000002');
  PERFORM set_config('request.jwt.claims', '{"sub":"not-a-uuid","role":"authenticated"}', true);

  BEGIN
    INSERT INTO public.events (
      workspace_id, created_by, name, slug, type, format, status,
      start_date, start_time, end_date, end_time, timezone
    )
    VALUES (
      current_setting('test.owner_workspace')::UUID,
      '20000000-0000-4000-8000-000000000002', 'Invalid Subject Event', 'invalid-subject-event',
      'Conference', 'In-person', 'draft', '2026-12-12', '09:00',
      '2026-12-12', '17:00', 'Asia/Kolkata'
    );
    RAISE EXCEPTION 'FAIL: request with a malformed JWT subject inserted an event';
  EXCEPTION WHEN insufficient_privilege OR invalid_text_representation THEN NULL;
  END;
  RESET ROLE;
END $$;

-- An admin retains exactly the event write operations granted by the seeded role.
DO $$
DECLARE
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000003');
  IF NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.read')
     OR NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.create')
     OR NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.update')
     OR NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.delete') THEN
    RAISE EXCEPTION 'FAIL: admin event permission mapping differs from seeded permissions';
  END IF;

  INSERT INTO public.events (
    workspace_id, created_by, name, slug, type, format, status,
    start_date, start_time, end_date, end_time, timezone
  )
  VALUES (
    current_setting('test.owner_workspace')::UUID,
    '20000000-0000-4000-8000-000000000003', 'Admin Event', 'admin-event',
    'Conference', 'In-person', 'draft', '2026-12-07', '09:00',
    '2026-12-07', '17:00', 'Asia/Kolkata'
  );

  UPDATE public.events SET name = 'Admin Updated Event' WHERE slug = 'admin-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: admin could not update an event'; END IF;

  DELETE FROM public.events WHERE slug = 'admin-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: admin could not delete an event'; END IF;
  RESET ROLE;
END $$;

-- A member receives create/update but not delete, matching the seeded role grants.
DO $$
DECLARE
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000006');
  IF NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.create')
     OR NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.update')
     OR public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.delete') THEN
    RAISE EXCEPTION 'FAIL: member event permission mapping differs from seeded permissions';
  END IF;

  INSERT INTO public.events (
    workspace_id, created_by, name, slug, type, format, status,
    start_date, start_time, end_date, end_time, timezone
  )
  VALUES (
    current_setting('test.owner_workspace')::UUID,
    '20000000-0000-4000-8000-000000000006', 'Member Event', 'member-event',
    'Conference', 'In-person', 'draft', '2026-12-10', '09:00',
    '2026-12-10', '17:00', 'Asia/Kolkata'
  );

  UPDATE public.events SET name = 'Member Updated Event' WHERE slug = 'member-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: member could not update an event'; END IF;

  DELETE FROM public.events WHERE slug = 'member-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: member deleted an event without permission'; END IF;
  RESET ROLE;
END $$;

-- The owner retains seeded event permissions, but cannot read, write, or move events
-- into another workspace where they have no membership.
DO $$
DECLARE
  affected_rows INT;
  visible_events INT;
BEGIN
  PERFORM pg_temp.as_user('20000000-0000-4000-8000-000000000001');
  IF NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.read')
     OR NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.create')
     OR NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.update')
     OR NOT public.has_permission(current_setting('test.owner_workspace')::UUID, 'events.delete') THEN
    RAISE EXCEPTION 'FAIL: owner event permission mapping differs from seeded permissions';
  END IF;

  INSERT INTO public.events (
    workspace_id, created_by, name, slug, type, format, status,
    start_date, start_time, end_date, end_time, timezone
  )
  VALUES (
    current_setting('test.owner_workspace')::UUID,
    '20000000-0000-4000-8000-000000000001', 'Owner Created Event', 'owner-created-event',
    'Conference', 'In-person', 'draft', '2026-12-08', '09:00',
    '2026-12-08', '17:00', 'Asia/Kolkata'
  );

  UPDATE public.events SET name = 'Owner Updated Event'
  WHERE slug = 'rls-test-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: owner could not update an event'; END IF;

  BEGIN
    UPDATE public.events
    SET workspace_id = current_setting('test.viewer_workspace')::UUID
    WHERE slug = 'rls-test-event';
    RAISE EXCEPTION 'FAIL: owner moved event into an unauthorized workspace';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.events (
      workspace_id, created_by, name, slug, type, format, status,
      start_date, start_time, end_date, end_time, timezone
    )
    VALUES (
      current_setting('test.viewer_workspace')::UUID,
      '20000000-0000-4000-8000-000000000001', 'Cross Workspace Event', 'cross-workspace-event',
      'Conference', 'In-person', 'draft', '2026-12-09', '09:00',
      '2026-12-09', '17:00', 'Asia/Kolkata'
    );
    RAISE EXCEPTION 'FAIL: owner inserted an event into an unauthorized workspace';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT count(*) INTO visible_events FROM public.events WHERE slug = 'viewer-owned-event';
  IF visible_events <> 0 THEN RAISE EXCEPTION 'FAIL: owner read an event in another workspace'; END IF;

  UPDATE public.events SET name = 'Cross Workspace Update'
  WHERE slug = 'viewer-owned-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: owner updated another workspace event'; END IF;

  DELETE FROM public.events WHERE slug = 'viewer-owned-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: owner deleted another workspace event'; END IF;

  DELETE FROM public.events WHERE slug = 'owner-created-event';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: owner could not delete an event'; END IF;
  RESET ROLE;
END $$;

DO $$ BEGIN RAISE NOTICE 'events RLS: ALL CHECKS PASSED'; END $$;

ROLLBACK;
