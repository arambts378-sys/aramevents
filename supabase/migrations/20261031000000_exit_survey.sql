-- ==============================================================================
-- Exit survey: why public-site visitors leave
-- ==============================================================================
-- Written by the /api/exit-survey route with the service role, read by the
-- super-admin console with the service role. RLS is on with no policies, so
-- nobody can read or write it through the public Data API.
-- Reasons match src/lib/marketing/exitSurvey.ts. Idempotent.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.exit_survey_responses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason     TEXT NOT NULL CHECK (reason IN (
               'just_browsing', 'pricing_unclear', 'too_expensive', 'missing_feature',
               'hard_to_find', 'come_back_later', 'other')),
  comment    TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  page_path  TEXT CHECK (page_path IS NULL OR char_length(page_path) <= 300),
  device     TEXT CHECK (device IS NULL OR device IN ('desktop', 'mobile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exit_survey_created ON public.exit_survey_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exit_survey_reason ON public.exit_survey_responses (reason, created_at DESC);

ALTER TABLE public.exit_survey_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exit_survey_responses FROM anon, authenticated;
