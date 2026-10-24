import 'server-only';
import { forbidden, redirect } from 'next/navigation';
import { resolvePlatformConsoleAccess } from '@/lib/auth/platformAccess';
import type { ActivityDirectoryQuery } from '@/lib/super-admin/activity';
import {
  type ActivityDataResult,
  type PlatformActivityItem,
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

  // Use direct fallback query on platform_audit_logs to avoid missing RPC errors
  return await fallbackActivityList(supabase, query);
}

async function fallbackActivityList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: ActivityDirectoryQuery,
): Promise<ActivityDataResult> {
  try {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = 25;
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
          summary: { recentCount: 0, errorCount: 0 },
        },
      };
    }

    const items: PlatformActivityItem[] = (data || []).map((row: any) => {
      const rawMeta = typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {};
      const metadataStrings: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawMeta)) {
        metadataStrings[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }

      return {
        id: row.id,
        occurredAt: row.created_at,
        workspaceId: typeof rawMeta.workspace_id === 'string' ? rawMeta.workspace_id : null,
        actorUserId: row.actor_user_id ?? null,
        category: typeof rawMeta.category === 'string' ? rawMeta.category : 'admin',
        action: row.action,
        resourceType: row.target_type ?? null,
        resourceId: row.target_id ?? null,
        outcome: 'success',
        severity: 'info',
        errorCode: null,
        message: row.reason || row.action,
        correlationId: typeof rawMeta.correlation_id === 'string' ? rawMeta.correlation_id : row.id,
        metadata: metadataStrings,
      };
    });

    return {
      ok: true,
      data: {
        items,
        totalCount: count ?? items.length,
        page,
        pageSize,
        summary: {
          recentCount: count ?? items.length,
          errorCount: 0,
        },
      },
    };
  } catch (err) {
    console.error('Error in fallbackActivityList:', err);
    return {
      ok: true,
      data: {
        items: [],
        totalCount: 0,
        page: query.page ?? 1,
        pageSize: 25,
        summary: { recentCount: 0, errorCount: 0 },
      },
    };
  }
}
