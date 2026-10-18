import 'server-only';
import { forbidden, redirect } from 'next/navigation';
import { resolvePlatformConsoleAccess } from '@/lib/auth/platformAccess';
import type { ActivityDirectoryQuery } from '@/lib/super-admin/activity';
import {
  parsePlatformActivityData,
  type ActivityDataResult,
} from '@/lib/super-admin/activityData';
import { createClient } from '@/lib/supabase/server';

export async function getPlatformActivity(
  query: ActivityDirectoryQuery,
): Promise<ActivityDataResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    console.error('Failed to authenticate platform activity request.');
    redirect('/login?next=%2Fsuper-admin%2Factivity');
  }
  if (!user) redirect('/login?next=%2Fsuper-admin%2Factivity');

  const access = await resolvePlatformConsoleAccess(user.id, async () => {
    const { data, error } = await supabase.rpc('has_platform_permission', {
      p_permission: 'activity.read',
    });
    return { data, error };
  });
  if (access !== 'allowed') forbidden();

  const toDate = query.to ? `${query.to}T23:59:59.999Z` : null;
  const { data, error } = await supabase.rpc('list_platform_activity', {
    p_workspace_id: query.workspaceId,
    p_category: query.category,
    p_action: query.action,
    p_outcome: query.outcome,
    p_severity: query.severity,
    p_from: query.from ? `${query.from}T00:00:00.000Z` : null,
    p_to: toDate,
    p_correlation_id: query.correlationId,
    p_search: query.search,
    p_page: query.page,
    p_page_size: 25,
  });

  if (error) {
    console.error('Failed to load platform activity.');
    return { ok: false, message: 'Activity could not be loaded. Please try again.' };
  }
  const parsed = data === null ? null : parsePlatformActivityData(data);
  if (!parsed) {
    console.error('Platform activity returned an invalid data shape.');
    return { ok: false, message: 'Activity could not be loaded. Please try again.' };
  }
  return { ok: true, data: parsed };
}
