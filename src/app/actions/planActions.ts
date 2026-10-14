'use server';

import { createClient } from '@/lib/supabase/server';
import { loadWorkspacePlan } from '@/services/planService';
import type { PlanResult, ResolvedWorkspacePlan, WorkspaceSubscriptionRow } from '@/types/subscription';

/**
 * Returns the resolved plan for a workspace the authenticated user belongs to.
 * Uses the cookie-bound (RLS-scoped) server client only — never the service role.
 * Read-only: there is intentionally no server action to assign plans in Phase 1.
 */
export async function getWorkspacePlan(workspaceId: string): Promise<PlanResult<ResolvedWorkspacePlan>> {
  const supabase = await createClient();

  return loadWorkspacePlan(
    {
      async getAuthenticatedUserId() {
        const { data, error } = await supabase.auth.getUser();
        return error || !data.user ? null : data.user.id;
      },
      async isWorkspaceMember(wsId, userId) {
        const { data, error } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', wsId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return !!data;
      },
      async fetchSubscription(wsId) {
        const { data, error } = await supabase
          .from('workspace_subscriptions')
          .select(
            'workspace_id, plan_id, status, billing_interval, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end, entitlement_overrides, created_at, updated_at',
          )
          .eq('workspace_id', wsId)
          .maybeSingle();
        if (error) throw error;
        return (data as WorkspaceSubscriptionRow | null) ?? null;
      },
    },
    workspaceId,
  );
}
