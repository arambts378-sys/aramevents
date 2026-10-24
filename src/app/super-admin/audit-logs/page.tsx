import React from 'react';
import Link from 'next/link';
import { getPlatformAuditLogs } from '@/services/superAdminPortal.server';

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
  return `/super-admin/audit-logs${qStr ? `?${qStr}` : ''}`;
}

function formatDate(val: string) {
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(d);
}

function getActionBadgeStyle(action: string) {
  if (action.includes('suspended')) {
    return 'bg-[#FFDAD6] text-[#BA1A1A] border-[#FFDAD6]';
  }
  if (action.includes('moderated') || action.includes('flag')) {
    return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
  }
  if (action.includes('reactivated') || action.includes('restore') || action.includes('provisioned')) {
    return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
  }
  return 'bg-[#EDE9FE] text-[#7C5CFC] border-[#DDD6FE]';
}

export default async function SuperAdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = typeof params.q === 'string' ? params.q.trim() : undefined;
  const action = typeof params.action === 'string' ? params.action : undefined;
  const targetType = typeof params.targetType === 'string' ? params.targetType : undefined;
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const result = await getPlatformAuditLogs({
    search,
    action: action === 'all' ? undefined : action,
    targetType: targetType === 'all' ? undefined : targetType,
    page,
    pageSize: 25,
  });

  const { items, totalCount, pageSize } = result.ok
    ? result.data
    : { items: [], totalCount: 0, pageSize: 25 };
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#7C5CFC]">
          Security & Compliance
        </p>
        <h1 className="mt-1 font-space text-2xl sm:text-3xl font-bold tracking-tight text-[#17152B]">
          Platform Audit Logs
        </h1>
        <p className="mt-1 text-sm text-[#77738A]">
          Immutable, append-only record of all administrative operations, account suspensions, and event moderation.
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-[#FAF8FF] border border-[#E6E2F0] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7C5CFC]/10 text-[#7C5CFC] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </div>
          <p className="text-xs text-[#5A566B]">
            <strong>Append-Only Protection:</strong> Database triggers block all update and delete mutations on the audit log table.
          </p>
        </div>
        <span className="hidden sm:inline-flex text-[11px] font-bold text-[#10B981] bg-[#DCFCE7] px-2.5 py-1 rounded-full shrink-0">
          Tamper-Proof
        </span>
      </div>

      {/* Filter Bar */}
      <section className="bg-white rounded-2xl border border-[#E6E2F0] p-4 sm:p-5 shadow-2xs">
        <form
          action="/super-admin/audit-logs"
          method="get"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div className="lg:col-span-2">
            <label htmlFor="search-audit" className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5">
              Search Logs
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-[#77738A] absolute left-3 top-2.5">
                search
              </span>
              <input
                id="search-audit"
                name="q"
                type="search"
                defaultValue={search ?? ''}
                placeholder="Search action, reason, target ID, actor email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D8D3E3] text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="target-select" className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5">
              Target Entity
            </label>
            <select
              id="target-select"
              name="targetType"
              defaultValue={targetType ?? 'all'}
              className="w-full px-3 py-2 rounded-xl border border-[#D8D3E3] text-sm text-[#17152B] bg-white outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            >
              <option value="all">All Targets</option>
              <option value="workspace">Workspaces</option>
              <option value="event">Events</option>
              <option value="platform_role">Platform Roles</option>
              <option value="platform_session">Admin Sessions</option>
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
              href="/super-admin/audit-logs"
              className="px-3 py-2 rounded-xl border border-[#E6E2F0] text-[#77738A] hover:bg-[#F6F1FF] text-xs font-semibold h-[38px] flex items-center justify-center transition-colors"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* Audit Log Table */}
      <section className="bg-white rounded-2xl border border-[#E6E2F0] overflow-hidden shadow-2xs">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">security</span>
            </div>
            <p className="font-space text-base font-bold text-[#17152B]">No audit records found</p>
            <p className="mt-1 text-xs text-[#77738A]">
              Administrative actions such as suspensions, restorations, and event moderations will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8FF] text-[#77738A] font-semibold border-b border-[#E6E2F0]">
                  <tr>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">Action</th>
                    <th className="px-4 py-3.5">Target</th>
                    <th className="px-4 py-3.5">Administrator</th>
                    <th className="px-4 py-3.5">Justification / Reason</th>
                    <th className="px-4 py-3.5">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDF8]">
                  {items.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F9F7FF] transition-colors">
                      <td className="px-4 py-3.5 text-[#5A566B] whitespace-nowrap font-mono text-[11px]">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getActionBadgeStyle(
                            log.action,
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#17152B] capitalize">
                            {log.targetType || 'System'}
                          </span>
                          {log.targetId && (
                            <span className="text-[10px] text-[#77738A] font-mono truncate max-w-[140px]" title={log.targetId}>
                              {log.targetId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#5A566B]">
                        <span className="block font-medium truncate max-w-[160px]" title={log.actorEmail || log.actorUserId}>
                          {log.actorEmail || log.actorUserId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#17152B] max-w-xs">
                        <p className="line-clamp-2 leading-relaxed">
                          {log.reason || <span className="text-[#77738A] italic">No reason specified</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-[#77738A]">
                        {Object.keys(log.metadata || {}).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-[10px] font-semibold text-[#7C5CFC] hover:underline">
                              Payload ({Object.keys(log.metadata).length} keys)
                            </summary>
                            <pre className="mt-1 p-2 rounded-lg bg-[#17152B] text-white font-mono text-[10px] max-h-32 overflow-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-[11px] text-[#77738A]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-[#E6E2F0] flex items-center justify-between text-xs text-[#77738A]">
              <span>
                Showing page {page} of {totalPages} ({totalCount.toLocaleString()} total audit entries)
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
