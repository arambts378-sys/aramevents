'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getVolunteerEmails(eventId: string, userIds: string[]): Promise<Record<string, string>> {
  if (!eventId || typeof eventId !== 'string' || !Array.isArray(userIds) || userIds.length === 0) {
    return {};
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Verify caller has permission to view volunteers for this event's workspace
  const { data: event } = await supabase
    .from('events')
    .select('workspace_id')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) {
    throw new Error('Event not found');
  }

  const { data: hasPerm } = await supabase.rpc('has_permission', {
    workspace_id: event.workspace_id,
    required_permission: 'volunteers.view',
  });

  if (!hasPerm) {
    throw new Error('Forbidden');
  }

  // Only allow looking up users who belong to this workspace (prevent arbitrary ID enumeration)
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', event.workspace_id)
    .in('user_id', userIds);

  const allowedUserIds = new Set((members || []).map((m) => m.user_id));
  const adminClient = createAdminClient();
  const result: Record<string, string> = {};

  for (const id of allowedUserIds) {
    try {
      const { data } = await adminClient.auth.admin.getUserById(id);
      if (data?.user?.email) {
        result[id] = data.user.email;
      }
    } catch {
      // safe ignore
    }
  }

  return result;
}
