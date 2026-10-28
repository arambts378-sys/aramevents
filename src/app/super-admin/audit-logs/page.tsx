import React from 'react';
import Link from 'next/link';
import { EmptyPanel, PageHeader, StatusPill, type PillTone } from '@/components/ui';
import { FilterTabs, Pager, SearchBox } from '@/components/super-admin/Pager';
import { fmtAgo } from '@/components/super-admin/fmt';
import { listAuditLog } from '@/services/superAdminLive.server';

type SearchParams = Record<string, string | string[] | undefined>;

function tone(action: string): PillTone {
  if (/blocked|suspended|unpublished|archived|removed|revoked|paused/.test(action)) return 'danger';
  if (/unblocked|reactivated|published|granted|resumed|confirmed/.test(action)) return 'success';
  return 'neutral';
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const params = {
    q: typeof raw.q === 'string' ? raw.q : undefined,
    type: typeof raw.type === 'string' ? raw.type : undefined,
  };
  const page = Math.max(1, Number(raw.page) || 1);
  const result = await listAuditLog({ ...params, page });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Every change made from this console: who did it, to what, and why. Entries can’t be edited or deleted."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          base="/super-admin/audit-logs"
          params={params}
          name="type"
          active={params.type ?? 'all'}
          options={[
            { value: 'all', label: 'All' },
            { value: 'user', label: 'Accounts' },
            { value: 'workspace', label: 'Workspaces' },
            { value: 'event', label: 'Events' },
            { value: 'platform_role', label: 'Admin access' },
            { value: 'platform_settings', label: 'Settings' },
          ]}
        />
        <SearchBox base="/super-admin/audit-logs" params={params} placeholder="Search action or reason" />
      </div>

      <section className="ds-card overflow-hidden">
        {!result.ok ? (
          <EmptyPanel icon="error" title="Couldn’t read the audit log" description={result.message} />
        ) : result.data.items.length === 0 ? (
          <EmptyPanel icon="history" title="No entries yet" description="Blocking an account, unpublishing an event or changing admin access is recorded here." />
        ) : (
          <>
            <div className="ds-table-wrap">
              <table className="ds-table min-w-[820px]">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Action</th>
                    <th scope="col">Target</th>
                    <th scope="col">Reason</th>
                    <th scope="col">By</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap text-ds-muted" title={new Date(e.createdAt).toISOString()}>{fmtAgo(e.createdAt)}</td>
                      <td><StatusPill tone={tone(e.action)} dot={false}>{e.action.replace(/[._]/g, ' ')}</StatusPill></td>
                      <td className="max-w-[240px]">
                        {e.targetHref ? (
                          <Link href={e.targetHref} className="block truncate text-ds-ink hover:text-ds-accent">{e.targetLabel}</Link>
                        ) : (
                          <span className="block truncate">{e.targetLabel ?? '—'}</span>
                        )}
                      </td>
                      <td className="max-w-[320px] text-ds-body"><span className="line-clamp-2">{e.reason ?? '—'}</span></td>
                      <td className="whitespace-nowrap text-ds-muted">{e.actorEmail ?? 'Unknown admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager base="/super-admin/audit-logs" params={params} page={result.data.page} pageSize={result.data.pageSize} total={result.data.total} noun="entries" />
          </>
        )}
      </section>
    </div>
  );
}
