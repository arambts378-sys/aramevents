import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';
import { getPlatformOrganizers } from '@/services/superAdminPortal.server';
import { OrganizersTableClient } from '@/components/super-admin/OrganizersTableClient';

type SearchParams = Record<string, string | string[] | undefined>;

function buildPageHref(params: SearchParams, newPage: number): string {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v && k !== 'page') {
      query.set(k, v);
    }
  }
  if (newPage > 1) {
    query.set('page', String(newPage));
  }
  const qStr = query.toString();
  return `/super-admin/organizers${qStr ? `?${qStr}` : ''}`;
}

export default async function SuperAdminOrganizersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = typeof params.q === 'string' ? params.q.trim() : undefined;
  const plan = typeof params.plan === 'string' ? params.plan : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : 'created_at';
  const direction = typeof params.direction === 'string' ? params.direction : 'desc';
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const result = await getPlatformOrganizers({
    search,
    plan: plan === 'all' ? undefined : plan,
    status: status === 'all' ? undefined : status,
    sort,
    direction,
    page,
    pageSize: 20,
  });

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-[#FCA5A5]/40 bg-[#FEF2F2] p-6 text-[#991B1B]">
        <h1 className="font-space text-xl font-bold">Failed to load organizers</h1>
        <p className="mt-2 text-sm">{result.message}</p>
      </div>
    );
  }

  const { items, totalCount, pageSize } = result.data;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Administration"
        title="Organizer & Workspace Directory"
        description="Supervise tenant workspaces, monitor plan entitlements, and control account suspension."
      />

      {/* Filter Bar */}
      <section className="ds-card p-4 sm:p-5">
        <form
          action="/super-admin/organizers"
          method="get"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <div className="lg:col-span-2">
            <label htmlFor="search-input" className="block text-xs font-bold uppercase tracking-wider text-ds-muted mb-1.5">
              Search
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-ds-muted absolute left-3 top-2.5">
                search
              </span>
              <input
                id="search-input"
                name="q"
                type="search"
                defaultValue={search ?? ''}
                placeholder="Workspace name, slug, or ID..."
                className="ds-input pl-9 pr-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="plan-select" className="block text-xs font-bold uppercase tracking-wider text-ds-muted mb-1.5">
              Subscription Plan
            </label>
            <select
              id="plan-select"
              name="plan"
              defaultValue={plan ?? 'all'}
              className="ds-input"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-select" className="block text-xs font-bold uppercase tracking-wider text-ds-muted mb-1.5">
              Account Status
            </label>
            <select
              id="status-select"
              name="status"
              defaultValue={status ?? 'all'}
              className="ds-input"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-xl bg-ds-accent text-white text-xs font-bold hover:shadow-md transition-all h-[38px] cursor-pointer"
            >
              Filter
            </button>
            <Link
              href="/super-admin/organizers"
              className="px-3 py-2 rounded-xl border border-ds-line text-ds-muted hover:bg-ds-subtle text-xs font-semibold h-[38px] flex items-center justify-center transition-colors"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* Directory Table */}
      <section className="ds-card overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-ds-accent-soft text-ds-accent flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">corporate_fare</span>
            </div>
            <p className="font-space text-base font-bold text-ds-ink">No workspaces found</p>
            <p className="mt-1 text-xs text-ds-muted">
              Try adjusting your search criteria or plan filters.
            </p>
          </div>
        ) : (
          <>
            <OrganizersTableClient items={items} />

            {/* Pagination */}
            <div className="p-4 border-t border-ds-line flex items-center justify-between text-xs text-ds-muted">
              <span>
                Showing page {page} of {totalPages} ({totalCount.toLocaleString()} total organizations)
              </span>
              <div className="flex items-center gap-1.5">
                <Link
                  href={buildPageHref(params, page - 1)}
                  aria-disabled={page <= 1}
                  className={`px-3 py-1.5 rounded-lg border border-ds-line font-semibold ${
                    page <= 1
                      ? 'pointer-events-none opacity-40'
                      : 'hover:bg-ds-subtle text-ds-ink'
                  }`}
                >
                  Previous
                </Link>
                <Link
                  href={buildPageHref(params, page + 1)}
                  aria-disabled={page >= totalPages}
                  className={`px-3 py-1.5 rounded-lg border border-ds-line font-semibold ${
                    page >= totalPages
                      ? 'pointer-events-none opacity-40'
                      : 'hover:bg-ds-subtle text-ds-ink'
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
