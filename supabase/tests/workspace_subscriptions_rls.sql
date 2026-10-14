-- Local-only RLS verification for public.workspace_subscriptions.
-- NEVER run against production. Everything runs inside a transaction and is rolled back.
--
-- Usage (after `npx supabase start` and `npx supabase db reset`):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/workspace_subscriptions_rls.sql
--
-- Expected: script ends with NOTICE 'workspace_subscriptions RLS: ALL CHECKS PASSED'.

BEGIN;

-- Fixtures (as superuser). The auth trigger creates profile + workspace + owner membership.
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', '{"full_name":"Owner A"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'member-a@test.local', '{"full_name":"Member A"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', '{"full_name":"Owner B"}', 'authenticated', 'authenticated');

DO $$
DECLARE
  ws_a UUID; ws_b UUID; member_role UUID; ws_a2 UUID;
BEGIN
  SELECT id INTO ws_a FROM public.workspaces WHERE owner_id = '00000000-0000-0000-0000-0000000000a1' LIMIT 1;
  SELECT id INTO ws_b FROM public.workspaces WHERE owner_id = '00000000-0000-0000-0000-0000000000b1' LIMIT 1;
  SELECT id INTO ws_a2 FROM public.workspaces WHERE owner_id = '00000000-0000-0000-0000-0000000000a2' LIMIT 1;
  SELECT id INTO member_role FROM public.roles WHERE name = 'member';

  -- Make member-a an ordinary member of workspace A.
  INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
  VALUES (ws_a, '00000000-0000-0000-0000-0000000000a2', member_role);

  -- Operator assigns Professional to workspace B only (A has no row => Free default in app).
  INSERT INTO public.workspace_subscriptions (workspace_id, plan_id, status, billing_interval)
  VALUES (ws_b, 'professional', 'active', 'month');

  PERFORM set_config('test.ws_a', ws_a::text, true);
  PERFORM set_config('test.ws_b', ws_b::text, true);
END $$;

-- Helper to impersonate a user.
CREATE OR REPLACE FUNCTION pg_temp.as_user(uid UUID) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$ LANGUAGE plpgsql;

-- 1. Member of A cannot self-assign a paid plan (INSERT).
DO $$
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
  BEGIN
    INSERT INTO public.workspace_subscriptions (workspace_id, plan_id) VALUES (current_setting('test.ws_a')::uuid, 'professional');
    RAISE EXCEPTION 'FAIL: member inserted a paid plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- 2. Owner of A cannot self-assign a paid plan either.
DO $$
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
  BEGIN
    INSERT INTO public.workspace_subscriptions (workspace_id, plan_id) VALUES (current_setting('test.ws_a')::uuid, 'enterprise');
    RAISE EXCEPTION 'FAIL: owner inserted a paid plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- 3. Owner of B can read but cannot UPDATE or DELETE their row.
DO $$
DECLARE n INT;
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
  SELECT count(*) INTO n FROM public.workspace_subscriptions WHERE workspace_id = current_setting('test.ws_b')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: owner B cannot read own subscription'; END IF;
  BEGIN
    UPDATE public.workspace_subscriptions SET plan_id = 'enterprise' WHERE workspace_id = current_setting('test.ws_b')::uuid;
    RAISE EXCEPTION 'FAIL: owner updated plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.workspace_subscriptions WHERE workspace_id = current_setting('test.ws_b')::uuid;
    RAISE EXCEPTION 'FAIL: owner deleted subscription';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- 4. Workspace isolation: users of A cannot see B's subscription.
DO $$
DECLARE n INT;
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
  SELECT count(*) INTO n FROM public.workspace_subscriptions WHERE workspace_id = current_setting('test.ws_b')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: cross-workspace read'; END IF;
  RESET ROLE;
END $$;

-- 5. Constraints: overrides only for enterprise; unknown plan rejected.
DO $$
BEGIN
  BEGIN
    UPDATE public.workspace_subscriptions SET entitlement_overrides = '{"maxActiveEvents": 99}'
      WHERE workspace_id = current_setting('test.ws_b')::uuid;
    RAISE EXCEPTION 'FAIL: overrides allowed on professional';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.workspace_subscriptions (workspace_id, plan_id) VALUES (current_setting('test.ws_a')::uuid, 'platinum');
    RAISE EXCEPTION 'FAIL: unknown plan accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

DO $$ BEGIN RAISE NOTICE 'workspace_subscriptions RLS: ALL CHECKS PASSED'; END $$;

ROLLBACK;
