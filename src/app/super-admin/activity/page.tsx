import Link from 'next/link';
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_CATEGORIES,
  ACTIVITY_OUTCOMES,
  ACTIVITY_SEVERITIES,
  parseActivityDirectoryQuery,
} from '@/lib/super-admin/activity';
import { getPlatformActivity } from '@/services/superAdminActivity.server';

type SearchParams = Record<string, string | string[] | undefined>;

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function pageHref(params: SearchParams, page: number): string {
  const query = new URLSearchParams();
  for (const key of ['workspace', 'category', 'action', 'outcome', 'severity', 'from', 'to', 'correlation', 'q']) {
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }
  if (page > 1) query.set('page', String(page));
  return `/super-admin/activity${query.size ? `?${query.toString()}` : ''}`;
}

function label(value: string): string {
  return value.replaceAll('_', ' ');
}

export default async function SuperAdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = parseActivityDirectoryQuery(params);
  const result = await getPlatformActivity(query);

  if (!result.ok) {
    return (
      <section className="rounded-2xl border border-[#E6E2F0] bg-white p-5 sm:p-8" role="alert">
        <h1 className="font-space text-2xl font-bold">Activity diagnostics</h1>
        <p className="mt-3 text-sm text-[#77738A]">{result.message}</p>
      </section>
    );
  }

  const { data } = result;
  const pageCount = Math.max(1, Math.ceil(data.totalCount / data.pageSize));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-[#7C5CFC]">Platform diagnostics</p>
        <h1 className="mt-2 font-space text-2xl font-bold tracking-tight sm:text-3xl">Activity</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#77738A]">
          Review operational events and sanitized failures. No credentials, attendee details, or raw error payloads are shown.
        </p>
      </header>

      <section aria-label="Recent activity summary" className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#E6E2F0] bg-white p-4 sm:p-5">
          <p className="text-sm font-medium text-[#77738A]">Events in the last 24 hours</p>
          <p className="mt-2 font-space text-2xl font-bold tabular-nums">{data.summary.recentCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[#E6E2F0] bg-white p-4 sm:p-5">
          <p className="text-sm font-medium text-[#77738A]">Failures in the last 24 hours</p>
          <p className="mt-2 font-space text-2xl font-bold tabular-nums text-[#B42318]">{data.summary.errorCount.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E6E2F0] bg-white p-4 sm:p-5">
        <form action="/super-admin/activity" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="activity-search" className="mb-1.5 block text-sm font-semibold">Search safe message or code</label>
            <input id="activity-search" name="q" type="search" maxLength={100} defaultValue={query.search ?? ''} className="h-11 w-full rounded-lg border border-[#D8D3E3] px-3 text-sm outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20" />
          </div>
          <div>
            <label htmlFor="activity-correlation" className="mb-1.5 block text-sm font-semibold">Correlation ID</label>
            <input id="activity-correlation" name="correlation" type="text" maxLength={36} defaultValue={query.correlationId ?? ''} placeholder="UUID lookup" className="h-11 w-full rounded-lg border border-[#D8D3E3] px-3 font-mono text-xs outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20" />
          </div>
          <div>
            <label htmlFor="activity-workspace" className="mb-1.5 block text-sm font-semibold">Workspace ID</label>
            <input id="activity-workspace" name="workspace" type="text" maxLength={36} defaultValue={query.workspaceId ?? ''} placeholder="Exact workspace UUID" className="h-11 w-full rounded-lg border border-[#D8D3E3] px-3 font-mono text-xs outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20" />
          </div>
          <div>
            <label htmlFor="activity-category" className="mb-1.5 block text-sm font-semibold">Category</label>
            <select id="activity-category" name="category" defaultValue={query.category ?? ''} className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm">
              <option value="">All categories</option>
              {ACTIVITY_CATEGORIES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="activity-action" className="mb-1.5 block text-sm font-semibold">Action</label>
            <select id="activity-action" name="action" defaultValue={query.action ?? ''} className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm">
              <option value="">All actions</option>
              {ACTIVITY_ACTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="activity-outcome" className="mb-1.5 block text-sm font-semibold">Outcome</label>
            <select id="activity-outcome" name="outcome" defaultValue={query.outcome ?? ''} className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm">
              <option value="">All outcomes</option>
              {ACTIVITY_OUTCOMES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="activity-severity" className="mb-1.5 block text-sm font-semibold">Severity</label>
            <select id="activity-severity" name="severity" defaultValue={query.severity ?? ''} className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm">
              <option value="">All severities</option>
              {ACTIVITY_SEVERITIES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="activity-from" className="mb-1.5 block text-sm font-semibold">From</label>
            <input id="activity-from" name="from" type="date" defaultValue={query.from ?? ''} className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="activity-to" className="mb-1.5 block text-sm font-semibold">To</label>
            <input id="activity-to" name="to" type="date" defaultValue={query.to ?? ''} className="h-11 w-full rounded-lg border border-[#D8D3E3] bg-white px-3 text-sm" />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="h-11 rounded-lg bg-[#7C5CFC] px-5 text-sm font-semibold text-white hover:bg-[#5B3FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-2">Apply filters</button>
            <Link href="/super-admin/activity" className="rounded-lg px-4 py-3 text-sm font-semibold text-[#5B3FE8] hover:bg-[#F1EDFF]">Clear</Link>
          </div>
        </form>
      </section>

      {data.items.length === 0 ? (
        <section className="rounded-2xl border border-[#E6E2F0] bg-white px-5 py-12 text-center">
          <h2 className="font-space text-lg font-bold">No activity found</h2>
          <p className="mt-2 text-sm text-[#77738A]">Try changing or clearing the filters.</p>
        </section>
      ) : (
        <section aria-label="Activity events" className="space-y-3">
          {data.items.map((item) => (
            <article key={item.id} className="min-w-0 rounded-xl border border-[#E6E2F0] bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-all text-sm font-bold">{item.action}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.outcome === 'failure' ? 'bg-red-50 text-red-700' : item.outcome === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-[#F1EDFF] text-[#4C35C7]'}`}>
                      {label(item.outcome)} · {label(item.severity)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#5F5B70]">{item.message}</p>
                  {item.errorCode && <p className="mt-1 font-mono text-xs text-[#77738A]">Code: {item.errorCode}</p>}
                </div>
                <time className="shrink-0 text-xs text-[#77738A]" dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
              </div>

              <details className="mt-4 border-t border-[#F0EDF6] pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#5B3FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]">Sanitized event details</summary>
                <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <div><dt className="font-semibold text-[#77738A]">Event ID</dt><dd className="mt-1 break-all font-mono">{item.id}</dd></div>
                  <div><dt className="font-semibold text-[#77738A]">Correlation ID</dt><dd className="mt-1 break-all font-mono">{item.correlationId}</dd></div>
                  <div><dt className="font-semibold text-[#77738A]">Workspace</dt><dd className="mt-1 break-all font-mono">{item.workspaceId ?? 'Not available'}{item.workspaceId && <Link href={`/super-admin/customers/${item.workspaceId}`} className="ml-2 font-sans font-semibold text-[#5B3FE8] hover:underline">View customer</Link>}</dd></div>
                  <div><dt className="font-semibold text-[#77738A]">Actor ID</dt><dd className="mt-1 break-all font-mono">{item.actorUserId ?? 'System or anonymous operation'}</dd></div>
                  <div><dt className="font-semibold text-[#77738A]">Resource</dt><dd className="mt-1 break-all font-mono">{item.resourceType ? `${item.resourceType}: ${item.resourceId ?? 'not available'}` : 'Not available'}</dd></div>
                  {Object.entries(item.metadata).map(([key, value]) => <div key={key}><dt className="font-semibold text-[#77738A]">{label(key)}</dt><dd className="mt-1 break-all font-mono">{value}</dd></div>)}
                </dl>
              </details>
            </article>
          ))}
        </section>
      )}

      <nav aria-label="Activity pagination" className="flex items-center justify-between gap-3 rounded-xl border border-[#E6E2F0] bg-white p-4">
        <p className="text-xs text-[#77738A]">Page {data.page} of {pageCount} · {data.totalCount.toLocaleString()} events</p>
        <div className="flex gap-2">
          <Link aria-disabled={data.page <= 1} tabIndex={data.page <= 1 ? -1 : undefined} href={pageHref(params, data.page - 1)} className={`rounded-lg border border-[#D8D3E3] px-3 py-2 text-sm font-semibold ${data.page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-[#F4F1FC]'}`}>Previous</Link>
          <Link aria-disabled={data.page >= pageCount} tabIndex={data.page >= pageCount ? -1 : undefined} href={pageHref(params, data.page + 1)} className={`rounded-lg border border-[#D8D3E3] px-3 py-2 text-sm font-semibold ${data.page >= pageCount ? 'pointer-events-none opacity-50' : 'hover:bg-[#F4F1FC]'}`}>Next</Link>
        </div>
      </nav>
    </div>
  );
}
