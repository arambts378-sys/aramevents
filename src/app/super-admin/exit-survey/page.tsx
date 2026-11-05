import React from 'react';
import { EmptyPanel, PageHeader, StatCard } from '@/components/ui';
import { FilterTabs, Pager, SearchBox } from '@/components/super-admin/Pager';
import { fmtAgo } from '@/components/super-admin/fmt';
import { listExitSurvey } from '@/services/superAdminLive.server';
import { EXIT_REASONS, exitReasonLabel } from '@/lib/marketing/exitSurvey';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExitSurveyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const params = {
    q: typeof raw.q === 'string' ? raw.q : undefined,
    reason: typeof raw.reason === 'string' ? raw.reason : undefined,
  };
  const page = Math.max(1, Number(raw.page) || 1);
  const result = await listExitSurvey({ ...params, page });

  const ranked = result.ok
    ? EXIT_REASONS.map((r) => ({ ...r, count: result.data.byReason[r.id] ?? 0 })).sort((a, b) => b.count - a.count)
    : [];
  const top = ranked[0]?.count ? ranked[0] : null;
  const withComment = result.ok ? result.data.items.filter((i) => i.comment).length : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exit survey"
        description="Why visitors leave the public site. Aram Assist asks once per visit when someone heads for another tab."
      />

      {!result.ok ? (
        <section className="ds-card">
          <EmptyPanel icon="error" title="Couldn’t read exit survey answers" description={result.message} />
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Answers" value={result.data.allTime.toLocaleString('en-IN')} icon="forum" tone="accent" />
            <StatCard label="Last 7 days" value={result.data.last7Days.toLocaleString('en-IN')} icon="calendar_today" tone="info" />
            <StatCard label="Top reason" value={top ? top.label : '—'} hint={top ? `${top.count} answers` : undefined} icon="trending_up" tone="warning" />
          </div>

          {result.data.allTime > 0 && (
            <section className="ds-card p-5">
              <h2 className="text-[14px] font-semibold text-ds-ink">Reasons</h2>
              <ul className="mt-4 space-y-3">
                {ranked.map((r) => {
                  const pct = result.data.allTime ? Math.round((r.count / result.data.allTime) * 100) : 0;
                  return (
                    <li key={r.id} className="grid grid-cols-[minmax(0,180px)_1fr_auto] items-center gap-3 text-[13px]">
                      <span className="truncate text-ds-body">{r.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-ds-subtle">
                        <span className="block h-full rounded-full bg-ds-accent" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-16 text-right tabular-nums text-ds-muted">
                        {r.count} · {pct}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs
              base="/super-admin/exit-survey"
              params={params}
              name="reason"
              active={params.reason ?? 'all'}
              options={[{ value: 'all', label: 'All' }, ...EXIT_REASONS.map((r) => ({ value: r.id, label: r.label }))]}
            />
            <SearchBox base="/super-admin/exit-survey" params={params} placeholder="Search comments or pages" />
          </div>

          <section className="ds-card overflow-hidden">
            {result.data.items.length === 0 ? (
              <EmptyPanel
                icon="forum"
                title={result.data.allTime ? 'No answers match' : 'No answers yet'}
                description={
                  result.data.allTime
                    ? 'Try another reason or clear the search.'
                    : 'When a visitor leaves the public site, Aram Assist asks why. Their answers will appear here.'
                }
              />
            ) : (
              <>
                <div className="ds-table-wrap">
                  <table className="ds-table min-w-[760px]">
                    <thead>
                      <tr>
                        <th scope="col">When</th>
                        <th scope="col">Reason</th>
                        <th scope="col">Comment</th>
                        <th scope="col">Page</th>
                        <th scope="col">Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.items.map((e) => (
                        <tr key={e.id}>
                          <td className="whitespace-nowrap text-ds-muted" title={new Date(e.createdAt).toISOString()}>{fmtAgo(e.createdAt)}</td>
                          <td className="whitespace-nowrap font-medium text-ds-ink">{exitReasonLabel(e.reason)}</td>
                          <td className="max-w-[360px] text-ds-body">
                            {e.comment ? <span className="line-clamp-3">{e.comment}</span> : <span className="text-ds-muted">No comment</span>}
                          </td>
                          <td className="whitespace-nowrap text-ds-muted">{e.pagePath ?? '—'}</td>
                          <td className="whitespace-nowrap capitalize text-ds-muted">{e.device ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager base="/super-admin/exit-survey" params={params} page={result.data.page} pageSize={result.data.pageSize} total={result.data.total} noun="answers" />
              </>
            )}
          </section>
          {withComment > 0 && <p className="text-[12px] text-ds-muted">{withComment} of the answers on this page include a comment.</p>}
        </>
      )}
    </div>
  );
}
