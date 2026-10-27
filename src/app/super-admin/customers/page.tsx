import Link from 'next/link';
import { PageHeader } from '@/components/ui';
import { getCustomerDirectory } from '@/services/superAdminCustomers.server';
import {
  getPageCount,
  parseCustomerDirectoryQuery,
} from '@/lib/super-admin/customerDirectory';

type SearchParams = Record<string, string | string[] | undefined>;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function planLabel(planId: string, hasSubscription: boolean): string {
  const label = planId.charAt(0).toUpperCase() + planId.slice(1);
  return hasSubscription ? label : `${label} (default)`;
}

function buildPageHref(
  params: SearchParams,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const key of ['q', 'plan', 'sort', 'direction']) {
    const value = params[key];
    if (typeof value === 'string' && value) search.set(key, value);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return `/super-admin/customers${query ? `?${query}` : ''}`;
}

export default async function SuperAdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = parseCustomerDirectoryQuery(params);
  const result = await getCustomerDirectory(query);

  if (!result.ok) {
    return (
      <section className="ds-card p-5 sm:p-8" role="alert">
        <h1 className="font-space text-2xl font-bold">Customer organizations</h1>
        <p className="mt-3 text-sm text-ds-muted">{result.message}</p>
      </section>
    );
  }

  const { data } = result;
  const pageCount = getPageCount(data.totalCount, data.pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform administration"
        title="Customer organizations"
        description="Find a workspace and review its team, events, and subscription details."
      />

      <section aria-label="Platform customer summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total organizations', value: data.summary.organizationCount },
          { label: 'Active & trialing subscriptions', value: data.summary.activeSubscriptionCount },
          { label: 'Total events', value: data.summary.eventCount },
        ].map((metric) => (
          <div key={metric.label} className="ds-card p-4 sm:p-5">
            <p className="text-sm font-medium text-ds-muted">{metric.label}</p>
            <p className="mt-2 font-space text-2xl font-bold tabular-nums text-ds-ink">
              {metric.value.toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <section className="ds-card p-4 sm:p-5">
        <form action="/super-admin/customers" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto_auto] lg:items-end">
          <div>
            <label htmlFor="customer-search" className="mb-1.5 block text-sm font-semibold text-ds-ink">
              Search organizations
            </label>
            <input
              id="customer-search"
              name="q"
              type="search"
              maxLength={120}
              defaultValue={query.search ?? ''}
              placeholder="Name or exact workspace ID"
              className="ds-input"
            />
          </div>
          <div>
            <label htmlFor="plan-filter" className="mb-1.5 block text-sm font-semibold text-ds-ink">Plan</label>
            <select
              id="plan-filter"
              name="plan"
              defaultValue={query.plan ?? ''}
              className="ds-input"
            >
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort-filter" className="mb-1.5 block text-sm font-semibold text-ds-ink">Sort by</label>
            <select
              id="sort-filter"
              name="sort"
              defaultValue={query.sort}
              className="ds-input"
            >
              <option value="created_at">Creation date</option>
              <option value="name">Organization name</option>
              <option value="event_count">Event count</option>
            </select>
          </div>
          <div>
            <label htmlFor="direction-filter" className="mb-1.5 block text-sm font-semibold text-ds-ink">Order</label>
            <select
              id="direction-filter"
              name="direction"
              defaultValue={query.direction}
              className="ds-input"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-11 rounded-lg bg-ds-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-ds-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
          >
            Apply
          </button>
        </form>
        <p className="mt-3 text-xs text-ds-muted">
          Workspace account status is not available in the current schema; no status filter is applied.
        </p>
      </section>

      {data.items.length === 0 ? (
        <section className="ds-card px-5 py-12 text-center">
          <h2 className="font-space text-lg font-bold">No organizations found</h2>
          <p className="mt-2 text-sm text-ds-muted">Try a different name, workspace ID, or plan.</p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden ds-card md:block">
            <div className="overflow-x-auto">
              <table className="ds-table min-w-[850px]">
                <thead>
                  <tr>
                    {['Organization', 'Owner', 'Members', 'Events', 'Plan', 'Created'].map((heading) => (
                      <th key={heading} scope="col">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ds-line">
                  {data.items.map((customer) => (
                    <tr key={customer.id} className="align-top hover:bg-ds-subtle">
                      <td className="px-4 py-4">
                        <Link href={`/super-admin/customers/${customer.id}`} className="font-semibold text-ds-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent">
                          {customer.name}
                        </Link>
                        <p className="mt-1 font-mono text-xs text-ds-muted">{customer.id}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-ds-ink">
                        <p>{customer.ownerName || 'Owner unavailable'}</p>
                        {customer.ownerEmail && <p className="mt-1 text-xs text-ds-muted">{customer.ownerEmail}</p>}
                      </td>
                      <td className="px-4 py-4 text-sm tabular-nums">{customer.memberCount.toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm tabular-nums">{customer.eventCount.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-ds-accent-soft px-2.5 py-1 text-xs font-semibold text-ds-accent-strong">
                          {planLabel(customer.planId, customer.hasSubscription)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-ds-muted">{formatDate(customer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {data.items.map((customer) => (
              <article key={customer.id} className="ds-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/super-admin/customers/${customer.id}`} className="break-words font-space text-base font-bold text-ds-accent-strong hover:underline">
                      {customer.name}
                    </Link>
                    <p className="mt-1 break-all font-mono text-[11px] text-ds-muted">{customer.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ds-accent-soft px-2.5 py-1 text-xs font-semibold text-ds-accent-strong">
                    {planLabel(customer.planId, customer.hasSubscription)}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div><dt className="text-xs text-ds-muted">Owner</dt><dd className="mt-0.5 break-words font-medium">{customer.ownerName || 'Unavailable'}</dd></div>
                  <div><dt className="text-xs text-ds-muted">Members</dt><dd className="mt-0.5 font-medium tabular-nums">{customer.memberCount}</dd></div>
                  <div><dt className="text-xs text-ds-muted">Events</dt><dd className="mt-0.5 font-medium tabular-nums">{customer.eventCount}</dd></div>
                  <div><dt className="text-xs text-ds-muted">Created</dt><dd className="mt-0.5 font-medium">{formatDate(customer.createdAt)}</dd></div>
                </dl>
                {customer.ownerEmail && <p className="mt-3 break-all text-xs text-ds-muted">{customer.ownerEmail}</p>}
              </article>
            ))}
          </div>

          <nav aria-label="Customer directory pagination" className="flex flex-col gap-3 ds-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ds-muted">
              Page {data.page} of {pageCount} · {data.totalCount.toLocaleString()} organizations
            </p>
            <div className="flex gap-2">
              <Link
                aria-disabled={data.page <= 1}
                tabIndex={data.page <= 1 ? -1 : undefined}
                href={buildPageHref(params, data.page - 1)}
                className={`rounded-lg border border-ds-line-strong px-4 py-2 text-sm font-semibold ${data.page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-ds-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent'}`}
              >
                Previous
              </Link>
              <Link
                aria-disabled={data.page >= pageCount}
                tabIndex={data.page >= pageCount ? -1 : undefined}
                href={buildPageHref(params, data.page + 1)}
                className={`rounded-lg border border-ds-line-strong px-4 py-2 text-sm font-semibold ${data.page >= pageCount ? 'pointer-events-none opacity-50' : 'hover:bg-ds-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent'}`}
              >
                Next
              </Link>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
