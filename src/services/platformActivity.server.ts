import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  insertActivityBestEffort,
  isActivityUuid,
  resolveActivityCorrelationId,
  sanitizeActivityEvent,
  type ActivityEventInput,
} from '@/lib/super-admin/activity';

export function getActivityCorrelationId(requestId?: string | null): string {
  return resolveActivityCorrelationId(requestId, randomUUID);
}

export async function recordPlatformActivity(input: ActivityEventInput): Promise<boolean> {
  const event = sanitizeActivityEvent(input);
  if (!event) {
    console.warn('Invalid activity event was not persisted.');
    return false;
  }

  try {
    const admin = createAdminClient();
    return await insertActivityBestEffort(
      event,
      async (safeEvent) => {
        const { error } = await admin.from('platform_activity_events').insert(safeEvent);
        return { error };
      },
    );
  } catch {
    console.warn('Activity event could not be persisted.');
    return false;
  }
}

export async function resolveActivityWorkspace(eventId: string): Promise<string | null> {
  if (!isActivityUuid(eventId)) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('events')
      .select('workspace_id')
      .eq('id', eventId)
      .maybeSingle();
    if (error) {
      console.warn('Activity workspace could not be resolved.');
      return null;
    }
    return data?.workspace_id ?? null;
  } catch {
    console.warn('Activity workspace could not be resolved.');
    return null;
  }
}
