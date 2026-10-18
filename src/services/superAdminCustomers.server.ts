import 'server-only';
import { forbidden, notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformConsoleAccess } from '@/lib/auth/platformAccess';
import { CUSTOMER_PAGE_SIZE, isWorkspaceId, type CustomerDirectoryQuery } from '@/lib/super-admin/customerDirectory';
import {
  parseCustomerDetailData,
  parseCustomerDirectoryData,
  type CustomerDataResult,
  type CustomerDetailData,
  type CustomerDirectoryData,
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
  const { data, error } = await supabase.rpc('list_platform_customers', {
    p_search: query.search,
    p_plan: query.plan,
    p_sort: query.sort,
    p_sort_direction: query.direction,
    p_page: query.page,
    p_page_size: CUSTOMER_PAGE_SIZE,
  });

  if (error) {
    console.error('Failed to load Super Admin customer directory:', error);
    return { ok: false, message: 'Customer organizations could not be loaded. Please try again.' };
  }
  const parsed = data === null ? null : parseCustomerDirectoryData(data);
  if (!parsed) {
    console.error('Customer directory returned an invalid data shape.');
    return { ok: false, message: 'Customer organizations could not be loaded. Please try again.' };
  }
  return { ok: true, data: parsed };
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

  const { data, error } = await supabase.rpc('get_platform_customer_detail', {
    p_workspace_id: workspaceId,
    p_member_page: memberPage,
    p_event_page: eventPage,
    p_page_size: CUSTOMER_PAGE_SIZE,
  });

  if (error) {
    console.error('Failed to load Super Admin customer details:', error);
    return { ok: false, message: 'Customer details could not be loaded. Please try again.' };
  }
  if (data === null) return { ok: false, message: 'Customer organization not found.' };
  const parsed = parseCustomerDetailData(data);
  if (!parsed) {
    console.error('Customer detail returned an invalid data shape.');
    return { ok: false, message: 'Customer details could not be loaded. Please try again.' };
  }
  return { ok: true, data: parsed };
}
