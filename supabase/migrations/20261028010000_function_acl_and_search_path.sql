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
