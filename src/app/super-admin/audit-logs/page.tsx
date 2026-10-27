import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';
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
    return 'bg-[#FFDAD6] text-ds-danger border-[#FFDAD6]';
  }
  if (action.includes('moderated') || action.includes('flag')) {
    return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
  }
  if (action.includes('reactivated') || action.includes('restore') || action.includes('provisioned')) {
    return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
  }
  return 'bg-ds-accent-soft text-ds-accent border-[#DDD6FE]';
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
      <PageHeader
        eyebrow="Security & Compliance"
        title="Platform Audit Logs"
        description="Immutable, append-only record of all administrative operations, account suspensions, and event moderation."
      />

      {/* Security Notice */}
      <div className="bg-ds-subtle border border-ds-line rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ds-accent/10 text-ds-accent flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </div>
          <p className="text-xs text-ds-muted">
            <strong>Append-Only Protection:</strong> Database triggers block all update and delete mutations on the audit log table.
          </p>
        </div>
        <span className="hidden sm:inline-flex text-[11px] font-bold text-[#10B981] bg-[#DCFCE7] px-2.5 py-1 rounded-full shrink-0">
          Tamper-Proof
        </span>
      </div>

      {/* Filter Bar */}
      <section className="ds-card p-4 sm:p-5">
        <form
          action="/super-admin/audit-logs"
          method="get"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div className="lg:col-span-2">
            <label htmlFor="search-audit" className="block text-xs font-bold uppercase tracking-wider text-ds-muted mb-1.5">
              Search Logs
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-ds-muted absolute left-3 top-2.5">
                search
              </span>
              <input
                id="search-audit"
                name="q"
                type="search"
                defaultValue={search ?? ''}
                placeholder="Search action, reason, target ID, actor email..."
                className="ds-input pl-9 pr-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="target-select" className="block text-xs font-bold uppercase tracking-wider text-ds-muted mb-1.5">
              Target Entity
            </label>
            <select
              id="target-select"
              name="targetType"
              defaultValue={targetType ?? 'all'}
              className="ds-input"
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
              className="flex-1 px-4 py-2 rounded-xl bg-ds-accent text-white text-xs font-bold hover:shadow-md transition-all h-[38px] cursor-pointer"
            >
              Filter
            </button>
            <Link
              href="/super-admin/audit-logs"
              className="px-3 py-2 rounded-xl border border-ds-line text-ds-muted hover:bg-ds-subtle text-xs font-semibold h-[38px] flex items-center justify-center transition-colors"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* Audit Log Table */}
      <section className="ds-card overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-ds-accent-soft text-ds-accent flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">security</span>
            </div>
            <p className="font-space text-base font-bold text-ds-ink">No audit records found</p>
            <p className="mt-1 text-xs text-ds-muted">
              Administrative actions such as suspensions, restorations, and event moderations will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="ds-table min-w-[760px]">
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Action</th>
                    <th scope="col">Target</th>
                    <th scope="col">Administrator</th>
                    <th scope="col">Justification / Reason</th>
                    <th scope="col">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
                    <tr key={log.id} className="hover:bg-ds-subtle transition-colors">
                      <td className="px-4 py-3.5 text-ds-muted whitespace-nowrap font-mono text-[11px]">
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
                          <span className="font-semibold text-ds-ink capitalize">
                            {log.targetType || 'System'}
                          </span>
                          {log.targetId && (
                            <span className="text-[10px] text-ds-muted font-mono truncate max-w-[140px]" title={log.targetId}>
                              {log.targetId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-ds-muted">
                        <span className="block font-medium truncate max-w-[160px]" title={log.actorEmail || log.actorUserId}>
                          {log.actorEmail || log.actorUserId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-ds-ink max-w-xs">
                        <p className="line-clamp-2 leading-relaxed">
                          {log.reason || <span className="text-ds-muted italic">No reason specified</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-ds-muted">
                        {Object.keys(log.metadata || {}).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-[10px] font-semibold text-ds-accent hover:underline">
                              Payload ({Object.keys(log.metadata).length} keys)
                            </summary>
                            <pre className="mt-1 p-2 rounded-lg bg-ds-ink text-white font-mono text-[10px] max-h-32 overflow-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-[11px] text-ds-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-ds-line flex items-center justify-between text-xs text-ds-muted">
              <span>
                Showing page {page} of {totalPages} ({totalCount.toLocaleString()} total audit entries)
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
