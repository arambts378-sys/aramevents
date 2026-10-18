import Link from 'next/link';
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
      <section className="rounded-2xl border border-[#E6E2F0] bg-white p-5 sm:p-8" role="alert">
        <h1 className="font-space text-2xl font-bold">Customer organizations</h1>
        <p className="mt-3 text-sm text-[#77738A]">{result.message}</p>
      </section>
    );
  }

  const { data } = result;
  const pageCount = getPageCount(data.totalCount, data.pageSize);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-[#7C5CFC]">Platform administration</p>
        <h1 className="mt-2 font-space text-2xl font-bold tracking-tight sm:text-3xl">Customer organizations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#77738A]">
          Find a workspace and review its team, events, and subscription details.
        </p>
      </header>

      <section aria-label="Platform customer summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total organizations', value: data.summary.organizationCount },
          { label: 'Active & trialing subscriptions', value: data.summary.activeSubscriptionCount },
          { label: 'Total events', value: data.summary.eventCount },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[#E6E2F0] bg-white p-4 sm:p-5">
            <p className="text-sm font-medium text-[#77738A]">{metric.label}</p>
            <p className="mt-2 font-space text-2xl font-bold tabular-nums text-[#17152B]">
              {metric.value.toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#E6E2F0] bg-white p-4 sm:p-5">
        <form action="/super-admin/customers" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto_auto] lg:items-end">
          <div>
            <label htmlFor="customer-search" className="mb-1.5 block text-sm font-semibold text-[#17152B]">
              Search organizations
            </label>
            <input
              id="customer-search"
              name="q"
              type="search"
              maxLength={120}
              defaultValue={query.search ?? ''}
              placeholder="Name or exact workspace ID"
              className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            />
          </div>
          <div>
            <label htmlFor="plan-filter" className="mb-1.5 block text-sm font-semibold text-[#17152B]">Plan</label>
            <select
              id="plan-filter"
              name="plan"
              defaultValue={query.plan ?? ''}
              className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            >
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort-filter" className="mb-1.5 block text-sm font-semibold text-[#17152B]">Sort by</label>
            <select
              id="sort-filter"
              name="sort"
              defaultValue={query.sort}
              className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            >
              <option value="created_at">Creation date</option>
              <option value="name">Organization name</option>
              <option value="event_count">Event count</option>
            </select>
          </div>
          <div>
            <label htmlFor="direction-filter" className="mb-1.5 block text-sm font-semibold text-[#17152B]">Order</label>
            <select
              id="direction-filter"
              name="direction"
              defaultValue={query.direction}
              className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-11 rounded-lg bg-[#7C5CFC] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5B3FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2"
          >
            Apply
          </button>
        </form>
        <p className="mt-3 text-xs text-[#77738A]">
          Workspace account status is not available in the current schema; no status filter is applied.
        </p>
      </section>

      {data.items.length === 0 ? (
        <section className="rounded-2xl border border-[#E6E2F0] bg-white px-5 py-12 text-center">
          <h2 className="font-space text-lg font-bold">No organizations found</h2>
          <p className="mt-2 text-sm text-[#77738A]">Try a different name, workspace ID, or plan.</p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#E6E2F0] bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#F4F1FC]">
                  <tr>
                    {['Organization', 'Owner', 'Members', 'Events', 'Plan', 'Created'].map((heading) => (
                      <th key={heading} scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#666174]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2F0]">
                  {data.items.map((customer) => (
                    <tr key={customer.id} className="align-top hover:bg-[#FAF9FE]">
                      <td className="px-4 py-4">
                        <Link href={`/super-admin/customers/${customer.id}`} className="font-semibold text-[#5B3FE8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]">
                          {customer.name}
                        </Link>
                        <p className="mt-1 font-mono text-xs text-[#77738A]">{customer.id}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#17152B]">
                        <p>{customer.ownerName || 'Owner unavailable'}</p>
                        {customer.ownerEmail && <p className="mt-1 text-xs text-[#77738A]">{customer.ownerEmail}</p>}
                      </td>
                      <td className="px-4 py-4 text-sm tabular-nums">{customer.memberCount.toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm tabular-nums">{customer.eventCount.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-[#F1EDFF] px-2.5 py-1 text-xs font-semibold text-[#4C35C7]">
                          {planLabel(customer.planId, customer.hasSubscription)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#5A566B]">{formatDate(customer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {data.items.map((customer) => (
              <article key={customer.id} className="rounded-xl border border-[#E6E2F0] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/super-admin/customers/${customer.id}`} className="break-words font-space text-base font-bold text-[#5B3FE8] hover:underline">
                      {customer.name}
                    </Link>
                    <p className="mt-1 break-all font-mono text-[11px] text-[#77738A]">{customer.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#F1EDFF] px-2.5 py-1 text-xs font-semibold text-[#4C35C7]">
                    {planLabel(customer.planId, customer.hasSubscription)}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div><dt className="text-xs text-[#77738A]">Owner</dt><dd className="mt-0.5 break-words font-medium">{customer.ownerName || 'Unavailable'}</dd></div>
                  <div><dt className="text-xs text-[#77738A]">Members</dt><dd className="mt-0.5 font-medium tabular-nums">{customer.memberCount}</dd></div>
                  <div><dt className="text-xs text-[#77738A]">Events</dt><dd className="mt-0.5 font-medium tabular-nums">{customer.eventCount}</dd></div>
                  <div><dt className="text-xs text-[#77738A]">Created</dt><dd className="mt-0.5 font-medium">{formatDate(customer.createdAt)}</dd></div>
                </dl>
                {customer.ownerEmail && <p className="mt-3 break-all text-xs text-[#77738A]">{customer.ownerEmail}</p>}
              </article>
            ))}
          </div>

          <nav aria-label="Customer directory pagination" className="flex flex-col gap-3 rounded-xl border border-[#E6E2F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#686477]">
              Page {data.page} of {pageCount} · {data.totalCount.toLocaleString()} organizations
            </p>
            <div className="flex gap-2">
              <Link
                aria-disabled={data.page <= 1}
                tabIndex={data.page <= 1 ? -1 : undefined}
                href={buildPageHref(params, data.page - 1)}
                className={`rounded-lg border border-[#D8D3E3] px-4 py-2 text-sm font-semibold ${data.page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-[#F4F1FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]'}`}
              >
                Previous
              </Link>
              <Link
                aria-disabled={data.page >= pageCount}
                tabIndex={data.page >= pageCount ? -1 : undefined}
                href={buildPageHref(params, data.page + 1)}
                className={`rounded-lg border border-[#D8D3E3] px-4 py-2 text-sm font-semibold ${data.page >= pageCount ? 'pointer-events-none opacity-50' : 'hover:bg-[#F4F1FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]'}`}
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
