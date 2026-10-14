-- 20261013000000_workspace_subscriptions.sql
-- Phase 1: workspace plan assignment & subscription lifecycle.
--
-- * One row per workspace. Workspaces WITHOUT a row resolve to the Free plan in
--   application code (src/services/planService.ts); no backfill is performed.
-- * Plan prices/limits live only in src/config/plans.ts (single source of truth).
-- * No payment card data, no payment-provider identifiers.
-- * Authenticated users may READ their workspace's row only. All writes require
--   the service role (operator) — no client path can assign a paid plan.

CREATE TABLE public.workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_id IN ('free', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  billing_interval TEXT
    CHECK (billing_interval IN ('month', 'year', 'custom')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  -- Enterprise-only configurable limits; validated against an explicit schema in app code.
  entitlement_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_subscriptions_period_order CHECK (
    current_period_start IS NULL OR current_period_end IS NULL
    OR current_period_end > current_period_start
  ),
  CONSTRAINT workspace_subscriptions_overrides_object CHECK (
    jsonb_typeof(entitlement_overrides) = 'object'
  ),
  CONSTRAINT workspace_subscriptions_overrides_enterprise_only CHECK (
    plan_id = 'enterprise' OR entitlement_overrides = '{}'::jsonb
  ),
  CONSTRAINT workspace_subscriptions_trial_requires_end CHECK (
    status <> 'trialing' OR trial_ends_at IS NOT NULL
  )
);

-- workspace_id lookups are served by the UNIQUE constraint's index.
CREATE INDEX workspace_subscriptions_plan_status_idx
  ON public.workspace_subscriptions (plan_id, status);

-- Reuse the existing helper from 20260926000002_integrations.sql.
CREATE TRIGGER set_updated_at_workspace_subscriptions
  BEFORE UPDATE ON public.workspace_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace subscription"
  ON public.workspace_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Intentionally NO insert/update/delete policies for anon/authenticated.
-- Defence in depth: also remove table-level write privileges.
REVOKE ALL ON public.workspace_subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.workspace_subscriptions FROM authenticated;
GRANT SELECT ON public.workspace_subscriptions TO authenticated;
GRANT ALL ON public.workspace_subscriptions TO service_role;

-- Rollback (manual):
--   DROP TABLE IF EXISTS public.workspace_subscriptions;
