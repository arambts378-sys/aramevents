-- Local-only verification of integration-job worker RPC privileges.
-- Run after all migrations against a disposable local Supabase database.
-- This test does not create data and must never be run against production.
--
-- Expected: NOTICE 'integration job RPC ACL: ALL CHECKS PASSED'.

BEGIN;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.claim_integration_jobs(integer,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.claim_integration_jobs(integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: untrusted roles can execute claim_integration_jobs';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.claim_integration_jobs(integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service_role cannot execute claim_integration_jobs';
  END IF;

  IF has_function_privilege('anon', 'public.claim_integration_jobs_for_registration(uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.claim_integration_jobs_for_registration(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: untrusted roles can execute claim_integration_jobs_for_registration';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.claim_integration_jobs_for_registration(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service_role cannot execute claim_integration_jobs_for_registration';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'integration job RPC ACL: ALL CHECKS PASSED'; END $$;

ROLLBACK;
