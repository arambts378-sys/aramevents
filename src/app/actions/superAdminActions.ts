'use server';

import { createClient } from '@/lib/supabase/server';
import {
  manageWorkspaceSuspension,
  moderatePlatformEvent,
} from '@/services/superAdminPortal.server';
import type { EventModerationAction } from '@/lib/super-admin/types';
import { updateMonitoringSettings } from '@/services/platformMonitoring.server';
import type { MonitoringSettings } from '@/lib/monitoring/types';
import { revalidatePath } from 'next/cache';
import * as live from '@/services/superAdminLive.server';

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

export async function updateMonitoringSettingsAction(settings: MonitoringSettings) {
  const result = await updateMonitoringSettings(settings);
  if (result.ok) {
    revalidatePath('/super-admin/settings');
    revalidatePath('/super-admin/monitoring');
  }
  return result;
}

// --- Live console actions ---------------------------------------------------


function refreshConsole() {
  revalidatePath('/super-admin', 'layout');
}

async function withRefresh<T extends { ok: boolean }>(p: Promise<T>) {
  const result = await p;
  if (result.ok) refreshConsole();
  return result;
}

export async function setOrganizerBlockedAction(userId: string, block: boolean, reason: string) {
  return withRefresh(live.setOrganizerBlocked(userId, block, reason));
}
export async function confirmOrganizerEmailAction(userId: string) {
  return withRefresh(live.confirmOrganizerEmail(userId));
}
export async function sendOrganizerPasswordResetAction(userId: string) {
  return live.sendOrganizerPasswordReset(userId);
}
export async function setWorkspaceSuspendedAction(workspaceId: string, suspend: boolean, reason: string) {
  return withRefresh(live.setWorkspaceSuspended(workspaceId, suspend, reason));
}
export async function setMemberRoleAction(workspaceId: string, userId: string, roleId: string) {
  return withRefresh(live.setMemberRole(workspaceId, userId, roleId));
}
export async function removeMemberAction(workspaceId: string, userId: string) {
  return withRefresh(live.removeMember(workspaceId, userId));
}
export async function revokeInvitationAction(invitationId: string) {
  return withRefresh(live.revokeInvitation(invitationId));
}
export async function setEventStatusAction(eventId: string, status: 'published' | 'draft' | 'archived', reason: string) {
  return withRefresh(live.setEventStatus(eventId, status, reason));
}
export async function grantPlatformAccessAction(email: string, role: live.PlatformRoleName) {
  return withRefresh(live.grantPlatformAccess(email, role));
}
export async function updatePlatformAccessAction(userId: string, change: { role?: live.PlatformRoleName; isActive?: boolean }) {
  return withRefresh(live.updatePlatformAccess(userId, change));
}
export async function revokePlatformAccessAction(userId: string) {
  return withRefresh(live.revokePlatformAccess(userId));
}
export async function updateMyNameAction(fullName: string) {
  return withRefresh(live.updateMyName(fullName));
}
export async function changeMyPasswordAction(current: string, next: string) {
  return live.changeMyPassword(current, next);
}
export async function setPlatformRoleAction(userId: string, role: string) {
  return withRefresh(live.updatePlatformAccess(userId, { role: role as live.PlatformRoleName }));
}
