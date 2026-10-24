import React from 'react';
import Link from 'next/link';
import { getPlatformEvents } from '@/services/superAdminPortal.server';
import { EventsTableClient } from '@/components/super-admin/EventsTableClient';

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
  return `/super-admin/events${qStr ? `?${qStr}` : ''}`;
}

export default async function SuperAdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = typeof params.q === 'string' ? params.q.trim() : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const moderationStatus =
    typeof params.moderation === 'string' ? params.moderation : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : 'created_at';
  const direction = typeof params.direction === 'string' ? params.direction : 'desc';
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const result = await getPlatformEvents({
    search,
    status: status === 'all' ? undefined : status,
    moderationStatus: moderationStatus === 'all' ? undefined : moderationStatus,
    sort,
    direction,
    page,
    pageSize: 20,
  });

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-[#FCA5A5]/40 bg-[#FEF2F2] p-6 text-[#991B1B]">
        <h1 className="font-space text-xl font-bold">Failed to load platform events</h1>
        <p className="mt-2 text-sm">{result.message}</p>
      </div>
    );
  }

  const { items, totalCount, pageSize } = result.data;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#7C5CFC]">
          Platform Governance
        </p>
        <h1 className="mt-1 font-space text-2xl sm:text-3xl font-bold tracking-tight text-[#17152B]">
          Global Event Management
        </h1>
        <p className="mt-1 text-sm text-[#77738A]">
          Search across tenant workspaces, inspect event configurations, and execute controlled moderation actions.
        </p>
      </div>

      {/* Filter Bar */}
      <section className="bg-white rounded-2xl border border-[#E6E2F0] p-4 sm:p-5 shadow-2xs">
        <form
          action="/super-admin/events"
          method="get"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <div className="lg:col-span-2">
            <label htmlFor="search-input" className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5">
              Search Events
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-[#77738A] absolute left-3 top-2.5">
                search
              </span>
              <input
                id="search-input"
                name="q"
                type="search"
                defaultValue={search ?? ''}
                placeholder="Event name, slug, workspace, or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D8D3E3] text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status-select" className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5">
              Lifecycle Status
            </label>
            <select
              id="status-select"
              name="status"
              defaultValue={status ?? 'all'}
              className="w-full px-3 py-2 rounded-xl border border-[#D8D3E3] text-sm text-[#17152B] bg-white outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            >
              <option value="all">All Lifecycles</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label htmlFor="moderation-select" className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5">
              Moderation State
            </label>
            <select
              id="moderation-select"
              name="moderation"
              defaultValue={moderationStatus ?? 'all'}
              className="w-full px-3 py-2 rounded-xl border border-[#D8D3E3] text-sm text-[#17152B] bg-white outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            >
              <option value="all">All States</option>
              <option value="normal">Normal</option>
              <option value="flagged">Flagged for Review</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] text-white text-xs font-bold hover:shadow-md transition-all h-[38px] cursor-pointer"
            >
              Filter
            </button>
            <Link
              href="/super-admin/events"
              className="px-3 py-2 rounded-xl border border-[#E6E2F0] text-[#77738A] hover:bg-[#F6F1FF] text-xs font-semibold h-[38px] flex items-center justify-center transition-colors"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* Directory Table */}
      <section className="bg-white rounded-2xl border border-[#E6E2F0] overflow-hidden shadow-2xs">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">calendar_month</span>
            </div>
            <p className="font-space text-base font-bold text-[#17152B]">No events found</p>
            <p className="mt-1 text-xs text-[#77738A]">
              Try adjusting your search criteria or lifecycle filters.
            </p>
          </div>
        ) : (
          <>
            <EventsTableClient items={items} />

            {/* Pagination */}
            <div className="p-4 border-t border-[#E6E2F0] flex items-center justify-between text-xs text-[#77738A]">
              <span>
                Showing page {page} of {totalPages} ({totalCount.toLocaleString()} total events)
              </span>
              <div className="flex items-center gap-1.5">
                <Link
                  href={buildPageHref(params, page - 1)}
                  aria-disabled={page <= 1}
                  className={`px-3 py-1.5 rounded-lg border border-[#E6E2F0] font-semibold ${
                    page <= 1
                      ? 'pointer-events-none opacity-40'
                      : 'hover:bg-[#F6F1FF] text-[#17152B]'
                  }`}
                >
                  Previous
                </Link>
                <Link
                  href={buildPageHref(params, page + 1)}
                  aria-disabled={page >= totalPages}
                  className={`px-3 py-1.5 rounded-lg border border-[#E6E2F0] font-semibold ${
                    page >= totalPages
                      ? 'pointer-events-none opacity-40'
                      : 'hover:bg-[#F6F1FF] text-[#17152B]'
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
