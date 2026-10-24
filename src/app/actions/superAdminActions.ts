'use server';

import { createClient } from '@/lib/supabase/server';
import {
  manageWorkspaceSuspension,
  moderatePlatformEvent,
} from '@/services/superAdminPortal.server';
import type { EventModerationAction } from '@/lib/super-admin/types';

export interface VerifyAdminResult {
  authorized: boolean;
  role?: string;
  email?: string;
  message?: string;
}

export async function verifyPlatformAdminAction(): Promise<VerifyAdminResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { authorized: false, message: 'Unauthenticated' };
    }

    // Use the SECURITY DEFINER RPC — bypasses REVOKE ALL on platform_roles table
    const { data: hasAccess, error: permError } = await supabase.rpc(
      'has_platform_permission',
      { p_permission: 'console.view' },
    );

    if (permError) {
      console.error('has_platform_permission error:', permError);
      return {
        authorized: false,
        message: 'Access denied. Account is not a platform administrator.',
      };
    }

    if (!hasAccess) {
      return {
        authorized: false,
        message: 'Access denied. Account is not a platform administrator.',
      };
    }

    // Fetch role for display — use service-level RPC to read the role name
    const { data: roleData } = await supabase.rpc('get_my_platform_role');
    const role = roleData || 'super_admin';

    // Record login audit log (non-blocking)
    try {
      await supabase.rpc('record_platform_audit_log', {
        p_action: 'admin.session.verified',
        p_target_type: 'platform_session',
        p_target_id: user.id,
        p_reason: 'Admin verified login into master portal.',
        p_metadata: { role },
      });
    } catch {
      // Audit log failures do not block login
    }

    return {
      authorized: true,
      role,
      email: user.email,
    };
  } catch (err) {
    console.error('Error verifying platform admin:', err);
    return { authorized: false, message: 'Verification failed.' };
  }
}

export async function suspendWorkspaceAction(
  workspaceId: string,
  suspend: boolean,
  reason: string,
) {
  return await manageWorkspaceSuspension(workspaceId, suspend, reason);
}

export async function moderateEventAction(
  eventId: string,
  action: EventModerationAction,
  reason: string,
) {
  return await moderatePlatformEvent(eventId, action, reason);
}
