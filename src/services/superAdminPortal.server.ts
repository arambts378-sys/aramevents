import 'server-only';
import { forbidden, redirect, unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformConsoleAccess } from '@/lib/auth/platformAccess';
import type {
  PlatformOverviewData,
  PlatformOrganizerDirectoryData,
  PlatformEventDirectoryData,
  PlatformAuditLogDirectoryData,
  PlatformAuditLogItem,
  PlatformAnalyticsData,
  EventModerationAction,
  ServiceResult,
  PlatformAdminUser,
} from '@/lib/super-admin/types';

export async function authorizedAdminClient(requiredPermission = 'console.view') {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/super-admin/login?next=%2Fsuper-admin');
  }

  const access = await resolvePlatformConsoleAccess(user.id, async () => {
    const { data, error } = await supabase.rpc('has_platform_permission', {
      p_permission: requiredPermission,
    });
    return { data, error };
  });

  if (access !== 'allowed') {
    forbidden();
  }

  return { supabase, user };
}

export async function getAdminSessionUser(): Promise<PlatformAdminUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Use SECURITY DEFINER RPC — direct table access is revoked from authenticated
    const { data: role } = await supabase.rpc('get_my_platform_role');
    if (!role) return null;

    return {
      id: user.id,
      email: user.email ?? 'admin@arambts.internal',
      role,
      isActive: true,
      permissions:
        role === 'super_admin' || role === 'platform_super_admin'
          ? ['*']
          : ['console.view', 'customers.read', 'events.read'],
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    // Let Next.js control-flow signals (dynamic rendering, redirect, forbidden) propagate
    unstable_rethrow(err);
    console.error('Failed to get admin session user:', err);
    return null;
  }
}

export async function getPlatformOverview(): Promise<ServiceResult<PlatformOverviewData>> {
  try {
    const { supabase } = await authorizedAdminClient('console.view');

    // Use direct queries — the get_platform_overview_metrics RPC may not
    // exist yet if the full master admin migration hasn't been applied.
    return await fallbackOverviewMetrics(supabase);
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getPlatformOverview:', err);
    return { ok: false, message: 'Platform overview metrics could not be loaded.' };
  }
}

async function fallbackOverviewMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ServiceResult<PlatformOverviewData>> {
  try {
    const [
      { count: totalWorkspaces },
      { count: totalEvents },
      { count: totalRegistrations },
    ] = await Promise.all([
      supabase.from('workspaces').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('registrations').select('id', { count: 'exact', head: true }),
    ]);

    const { data: recentWorkspaces } = await supabase
      .from('workspaces')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentEvents } = await supabase
      .from('events')
      .select('id, name, slug, status, start_date, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      ok: true,
      data: {
        summary: {
          totalWorkspaces: totalWorkspaces ?? 0,
          suspendedWorkspaces: 0,
          totalOrganizers: totalWorkspaces ?? 0,
          totalEvents: totalEvents ?? 0,
          draftEvents: 0,
          publishedEvents: totalEvents ?? 0,
          archivedEvents: 0,
          liveEvents: 0,
          moderatedEvents: 0,
          totalRegistrations: totalRegistrations ?? 0,
        },
        recentWorkspaces: (recentWorkspaces || []).map((w) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
          is_suspended: false,
          created_at: w.created_at,
          owner_name: null,
          owner_email: null,
        })),
        recentEvents: (recentEvents || []).map((e) => ({
          id: e.id,
          name: e.name,
          slug: e.slug,
          status: e.status,
          moderation_status: 'normal',
          start_date: e.start_date,
          created_at: e.created_at,
          workspace_name: 'Workspace',
        })),
        recentAudits: [],
      },
    };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Fallback overview metrics failed:', err);
    return { ok: false, message: 'Platform metrics could not be loaded.' };
  }
}

export async function getPlatformOrganizers(query: {
  search?: string;
  plan?: string;
  status?: string;
  sort?: string;
  direction?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<PlatformOrganizerDirectoryData>> {
  try {
    const { supabase } = await authorizedAdminClient('customers.read');
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    // Use a safe base query — workspace_subscriptions table and is_suspended
    // column may not exist if those migrations haven't been applied yet.
    let dbQuery = supabase
      .from('workspaces')
      .select(
        `
        id,
        name,
        slug,
        owner_id,
        created_at,
        profiles:owner_id(full_name)
      `,
        { count: 'exact' },
      );

    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,slug.ilike.%${query.search}%`);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: query.direction === 'asc' })
      .range(offset, offset + pageSize - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      console.error('Failed to load platform organizers:', error);
      return { ok: false, message: 'Organizers could not be loaded.' };
    }

    const items = (data || []).map((w: any) => {
      const profile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles;

      return {
        id: w.id,
        name: w.name,
        slug: w.slug,
        ownerId: w.owner_id,
        ownerName: profile?.full_name ?? null,
        ownerEmail: null,
        memberCount: 1,
        eventCount: 0,
        registrationCount: 0,
        planId: 'free',
        subscriptionStatus: null,
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null,
        createdAt: w.created_at,
      };
    });

    return {
      ok: true,
      data: {
        items,
        totalCount: count ?? items.length,
        page,
        pageSize,
      },
    };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getPlatformOrganizers:', err);
    return { ok: false, message: 'Failed to load organizers directory.' };
  }
}

export async function getPlatformEvents(query: {
  search?: string;
  workspaceId?: string;
  status?: string;
  moderationStatus?: string;
  sort?: string;
  direction?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<PlatformEventDirectoryData>> {
  try {
    const { supabase } = await authorizedAdminClient('events.read');
    // Use direct query fallback since list_platform_events RPC is not in remote DB
    return await fallbackEventsList(supabase, query);
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getPlatformEvents:', err);
    return { ok: false, message: 'Platform events could not be loaded.' };
  }
}

async function fallbackEventsList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: any,
): Promise<ServiceResult<PlatformEventDirectoryData>> {
  try {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    let dbQuery = supabase
      .from('events')
      .select(
        `
        id,
        name,
        slug,
        status,
        type,
        format,
        start_date,
        end_date,
        start_time,
        end_time,
        timezone,
        location,
        created_at,
        workspace_id,
        workspaces:workspace_id(name)
      `,
        { count: 'exact' },
      );

    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,slug.ilike.%${query.search}%`);
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: query.direction === 'asc' })
      .range(offset, offset + pageSize - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw error;

    const items = (data || []).map((e: any) => {
      const workspace = Array.isArray(e.workspaces) ? e.workspaces[0] : e.workspaces;
      return {
        id: e.id,
        name: e.name,
        slug: e.slug,
        status: e.status,
        type: e.type,
        format: e.format,
        startDate: e.start_date,
        endDate: e.end_date,
        startTime: e.start_time,
        endTime: e.end_time,
        timezone: e.timezone,
        location: e.location,
        isModerated: Boolean(e.is_moderated),
        moderationStatus: e.moderation_status ?? 'normal',
        moderationReason: e.moderation_reason ?? null,
        createdAt: e.created_at,
        workspaceId: e.workspace_id,
        workspaceName: workspace?.name ?? 'Workspace',
        workspaceIsSuspended: false,
        organizerName: null,
        organizerEmail: null,
        registrationCount: 0,
      };
    });

    return {
      ok: true,
      data: {
        items,
        totalCount: count ?? items.length,
        page,
        pageSize,
      },
    };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Fallback events list failed:', err);
    return { ok: false, message: 'Events could not be loaded.' };
  }
}

export async function manageWorkspaceSuspension(
  workspaceId: string,
  suspend: boolean,
  reason: string,
): Promise<ServiceResult<{ ok: boolean }>> {
  try {
    const { supabase } = await authorizedAdminClient('customers.read');
    if (!reason || reason.trim().length < 3) {
      return { ok: false, message: 'A reason of at least 3 characters is required.' };
    }

    const { data, error } = await supabase.rpc('manage_platform_workspace_suspension', {
      p_workspace_id: workspaceId,
      p_suspend: suspend,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error('Failed to update workspace suspension:', error);
      return { ok: false, message: error.message || 'Failed to update workspace status.' };
    }

    return { ok: true, data: { ok: true } };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in manageWorkspaceSuspension:', err);
    return { ok: false, message: 'An unexpected error occurred while updating status.' };
  }
}

export async function moderatePlatformEvent(
  eventId: string,
  action: EventModerationAction,
  reason: string,
): Promise<ServiceResult<{ ok: boolean }>> {
  try {
    const { supabase } = await authorizedAdminClient('events.moderate');
    if (!reason || reason.trim().length < 3) {
      return { ok: false, message: 'A reason of at least 3 characters is required.' };
    }

    const { data, error } = await supabase.rpc('moderate_platform_event', {
      p_event_id: eventId,
      p_action: action,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error('Failed to moderate event:', error);
      return { ok: false, message: error.message || 'Failed to moderate event.' };
    }

    return { ok: true, data: { ok: true } };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in moderatePlatformEvent:', err);
    return { ok: false, message: 'An unexpected error occurred during event moderation.' };
  }
}

export async function getPlatformAuditLogs(query: {
  search?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<PlatformAuditLogDirectoryData>> {
  try {
    const { supabase } = await authorizedAdminClient('console.view');
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    let dbQuery = supabase
      .from('platform_audit_logs')
      .select('id, actor_user_id, action, target_type, target_id, reason, metadata, created_at', { count: 'exact' });

    if (query.search) {
      dbQuery = dbQuery.or(`action.ilike.%${query.search}%,reason.ilike.%${query.search}%`);
    }
    if (query.action) {
      dbQuery = dbQuery.eq('action', query.action);
    }
    if (query.targetType) {
      dbQuery = dbQuery.eq('target_type', query.targetType);
    }
    if (query.from) {
      dbQuery = dbQuery.gte('created_at', `${query.from}T00:00:00.000Z`);
    }
    if (query.to) {
      dbQuery = dbQuery.lte('created_at', `${query.to}T23:59:59.999Z`);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      return {
        ok: true,
        data: {
          items: [],
          totalCount: 0,
          page,
          pageSize,
        },
      };
    }

    const items: PlatformAuditLogItem[] = (data || []).map((row: any) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      actorEmail: null,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));

    return {
      ok: true,
      data: {
        items,
        totalCount: count ?? items.length,
        page,
        pageSize,
      },
    };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getPlatformAuditLogs:', err);
    return { ok: false, message: 'Audit logs could not be loaded.' };
  }
}

export async function getPlatformAnalytics(): Promise<ServiceResult<PlatformAnalyticsData>> {
  try {
    await authorizedAdminClient('console.view');

    // Return structured default analytics without calling missing RPC
    return {
      ok: true,
      data: {
        workspacesGrowth: [],
        eventsGrowth: [],
        registrationsGrowth: [],
        eventsByStatus: [],
        eventsByType: [],
        planDistribution: [],
      },
    };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getPlatformAnalytics:', err);
    return { ok: false, message: 'Platform analytics could not be loaded.' };
  }
}
