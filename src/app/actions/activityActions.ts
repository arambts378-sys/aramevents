'use server';

import { headers } from 'next/headers';
import { isActivityUuid, type ActivityAction, type ActivityErrorCode } from '@/lib/super-admin/activity';
import { createClient } from '@/lib/supabase/server';
import {
  getActivityCorrelationId,
  recordPlatformActivity,
} from '@/services/platformActivity.server';

const WORKSPACE_FAILURES: Partial<Record<ActivityAction, ActivityErrorCode>> = {
  'event.create_failed': 'EVENT_CREATE_FAILED',
  'event.publish_failed': 'EVENT_PUBLISH_FAILED',
  'website.save_failed': 'WEBSITE_SAVE_FAILED',
  'website.publish_failed': 'WEBSITE_PUBLISH_FAILED',
};

export async function recordWorkspaceActivityFailureAction(
  eventId: string,
  action: ActivityAction,
  errorCode: ActivityErrorCode,
  workspaceId?: string,
): Promise<void> {
  if (!isActivityUuid(eventId) || WORKSPACE_FAILURES[action] !== errorCode) return;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return;

  let authorizedWorkspaceId: string | null = null;
  if (action === 'event.create_failed') {
    if (!workspaceId || !isActivityUuid(workspaceId)) return;
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError || !membership) return;
    authorizedWorkspaceId = membership.workspace_id;
  } else {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, workspace_id')
      .eq('id', eventId)
      .maybeSingle();
    if (eventError || !event) return;
    authorizedWorkspaceId = event.workspace_id;
  }
  if (!authorizedWorkspaceId) return;
  const { data: canPerform, error: permissionError } = await supabase.rpc('has_permission', {
    workspace_id: authorizedWorkspaceId,
    required_permission: action === 'event.create_failed' ? 'events.create' : 'events.update',
  });
  if (permissionError || canPerform !== true) return;

  const requestId = (await headers()).get('x-request-id');
  await recordPlatformActivity({
    workspaceId: authorizedWorkspaceId,
    actorUserId: user.id,
    action,
    resourceType: 'event',
    resourceId: eventId,
    outcome: 'failure',
    errorCode,
    correlationId: getActivityCorrelationId(requestId),
  });
}
