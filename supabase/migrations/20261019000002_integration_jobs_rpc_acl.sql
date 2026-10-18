REVOKE ALL ON FUNCTION public.claim_integration_jobs(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_integration_jobs(INTEGER, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_integration_jobs_for_registration(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_integration_jobs_for_registration(UUID, TEXT)
  TO service_role;
