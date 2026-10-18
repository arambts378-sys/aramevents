export const CUSTOMER_PAGE_SIZE = 20;
export const CUSTOMER_PLANS = ['free', 'professional', 'enterprise'] as const;
export const CUSTOMER_SORTS = ['name', 'created_at', 'event_count'] as const;

export type CustomerPlanFilter = (typeof CUSTOMER_PLANS)[number];
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];
export type SortDirection = 'asc' | 'desc';

export interface CustomerDirectoryQuery {
  search: string | null;
  plan: CustomerPlanFilter | null;
  sort: CustomerSort;
  direction: SortDirection;
  page: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isWorkspaceId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function firstParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

export function parsePositivePage(value: string | string[] | undefined): number {
  const raw = firstParam(value);
  if (!raw || !/^\d{1,6}$/.test(raw)) return 1;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1;
}

export function parseCustomerDirectoryQuery(
  searchParams: Record<string, string | string[] | undefined>,
): CustomerDirectoryQuery {
  const rawSearch = firstParam(searchParams.q)?.trim() ?? '';
  const rawPlan = firstParam(searchParams.plan);
  const rawSort = firstParam(searchParams.sort);
  const rawDirection = firstParam(searchParams.direction);

  return {
    search: rawSearch ? rawSearch.slice(0, 120) : null,
    plan: CUSTOMER_PLANS.find((plan) => plan === rawPlan) ?? null,
    sort: CUSTOMER_SORTS.find((sort) => sort === rawSort) ?? 'created_at',
    direction: rawDirection === 'asc' ? 'asc' : 'desc',
    page: parsePositivePage(searchParams.page),
  };
}

export function getPageCount(totalCount: number, pageSize = CUSTOMER_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, totalCount) / pageSize));
}
