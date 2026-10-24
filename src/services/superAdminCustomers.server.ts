import 'server-only';
import { forbidden, notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformConsoleAccess } from '@/lib/auth/platformAccess';
import { CUSTOMER_PAGE_SIZE, isWorkspaceId, type CustomerDirectoryQuery } from '@/lib/super-admin/customerDirectory';
import {
  type CustomerDataResult,
  type CustomerDetailData,
  type CustomerDirectoryData,
  type CustomerDirectoryItem,
} from '@/lib/super-admin/customerData';

async function authorizedCustomerClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Failed to authenticate Super Admin customer request:', error);
    redirect('/login?next=%2Fsuper-admin%2Fcustomers');
  }
  if (!user) redirect('/login?next=%2Fsuper-admin%2Fcustomers');

  const access = await resolvePlatformConsoleAccess(user.id, async () => {
    const { data, error: permissionError } = await supabase.rpc('has_platform_permission', {
      p_permission: 'customers.read',
    });
    return { data, error: permissionError };
  });
  if (access !== 'allowed') forbidden();
  return supabase;
}

export async function getCustomerDirectory(
  query: CustomerDirectoryQuery,
): Promise<CustomerDataResult<CustomerDirectoryData>> {
  const supabase = await authorizedCustomerClient();
  return await fallbackCustomerDirectory(supabase, query);
}

async function fallbackCustomerDirectory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: CustomerDirectoryQuery,
): Promise<CustomerDataResult<CustomerDirectoryData>> {
  try {
    const page = Math.max(1, query.page ?? 1);
    const offset = (page - 1) * CUSTOMER_PAGE_SIZE;

    let dbQuery = supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, created_at, profiles:owner_id(full_name)', { count: 'exact' });

    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,slug.ilike.%${query.search}%`);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: query.direction === 'asc' })
      .range(offset, offset + CUSTOMER_PAGE_SIZE - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      return {
        ok: true,
        data: {
          items: [],
          totalCount: 0,
          page,
          pageSize: CUSTOMER_PAGE_SIZE,
          summary: {
            organizationCount: 0,
            activeSubscriptionCount: 0,
            eventCount: 0,
          },
        },
      };
    }

    const items: CustomerDirectoryItem[] = (data || []).map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        name: row.name,
        ownerId: row.owner_id ?? null,
        ownerName: profile?.full_name ?? null,
        ownerEmail: null,
        memberCount: 1,
        eventCount: 0,
        createdAt: row.created_at,
        planId: 'free',
        subscriptionStatus: 'active',
        billingInterval: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasSubscription: false,
      };
    });

    return {
      ok: true,
      data: {
        items,
        totalCount: count ?? items.length,
        page,
        pageSize: CUSTOMER_PAGE_SIZE,
        summary: {
          organizationCount: count ?? items.length,
          activeSubscriptionCount: count ?? items.length,
          eventCount: 0,
        },
      },
    };
  } catch (err) {
    console.error('Error in fallbackCustomerDirectory:', err);
    return {
      ok: true,
      data: {
        items: [],
        totalCount: 0,
        page: query.page ?? 1,
        pageSize: CUSTOMER_PAGE_SIZE,
        summary: {
          organizationCount: 0,
          activeSubscriptionCount: 0,
          eventCount: 0,
        },
      },
    };
  }
}

export async function getCustomerDetail(
  workspaceId: string,
  memberPage: number,
  eventPage: number,
): Promise<CustomerDataResult<CustomerDetailData>> {
  const supabase = await authorizedCustomerClient();
  if (!isWorkspaceId(workspaceId)) {
    notFound();
  }
  return await fallbackCustomerDetail(supabase, workspaceId, memberPage, eventPage);
}

async function fallbackCustomerDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  memberPage: number,
  eventPage: number,
): Promise<CustomerDataResult<CustomerDetailData>> {
  try {
    const { data: ws, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, created_at, profiles:owner_id(full_name)')
      .eq('id', workspaceId)
      .maybeSingle();

    if (wsError || !ws) {
      return { ok: false, message: 'Customer organization not found.' };
    }

    const profile = Array.isArray(ws.profiles) ? ws.profiles[0] : ws.profiles;

    return {
      ok: true,
      data: {
        organization: {
          id: ws.id,
          name: ws.name,
          ownerId: ws.owner_id ?? null,
          ownerName: profile?.full_name ?? null,
          ownerEmail: null,
          memberCount: 1,
          eventCount: 0,
          createdAt: ws.created_at,
          planId: 'free',
          subscriptionStatus: 'active',
          billingInterval: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasSubscription: false,
          currentPeriodStart: null,
          trialEndsAt: null,
          entitlementOverrides: null,
        },
        members: [],
        membersTotal: 0,
        memberPage,
        events: [],
        eventsTotal: 0,
        eventPage,
        pageSize: CUSTOMER_PAGE_SIZE,
      },
    };
  } catch (err) {
    console.error('Error in fallbackCustomerDetail:', err);
    return { ok: false, message: 'Customer details could not be loaded. Please try again.' };
  }
}
