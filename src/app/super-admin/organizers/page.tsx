import React from 'react';
import Link from 'next/link';
import { EmptyPanel, PageHeader, StatusPill } from '@/components/ui';
import { FilterTabs, Pager, SearchBox } from '@/components/super-admin/Pager';
import { STATUS_PILL, fmtAgo, fmtDate, roleLabel } from '@/components/super-admin/fmt';
import { listOrganizers } from '@/services/superAdminLive.server';

type SearchParams = Record<string, string | string[] | undefined>;


export default async function OrganizersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const params = {
    q: typeof raw.q === 'string' ? raw.q : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    sort: typeof raw.sort === 'string' ? raw.sort : undefined,
  };
  const page = Math.max(1, Number(raw.page) || 1);
  const result = await listOrganizers({ ...params, page });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organizers"
        description="Every account that has signed up to run events. Open one to manage its sign-in, workspaces, team and events."
      />

      {!result.ok ? (
        <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load organizers" description={result.message} /></div>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs
              base="/super-admin/organizers"
              params={params}
              name="status"
              active={params.status ?? 'all'}
              options={[
                { value: 'all', label: 'All', count: result.data.counts.all },
                { value: 'active', label: 'Active', count: result.data.counts.active },
                { value: 'unverified', label: 'Not verified', count: result.data.counts.unverified },
                { value: 'blocked', label: 'Blocked', count: result.data.counts.blocked },
              ]}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form action="/super-admin/organizers" className="flex items-center gap-2 text-[13px] text-ds-muted">
                {params.q && <input type="hidden" name="q" value={params.q} />}
                {params.status && <input type="hidden" name="status" value={params.status} />}
                <label htmlFor="sort">Sort</label>
                <select id="sort" name="sort" defaultValue={params.sort ?? 'newest'} className="ds-input w-auto">
                  <option value="newest">Newest first</option>
                  <option value="active">Recently active</option>
                  <option value="events">Most events</option>
                  <option value="name">Name</option>
                </select>
                <button type="submit" className="ds-btn ds-btn-secondary ds-btn-sm">Apply</button>
              </form>
              <SearchBox base="/super-admin/organizers" params={params} placeholder="Search name, email or workspace" />
            </div>
          </div>

          <section className="ds-card overflow-hidden">
            {result.data.items.length === 0 ? (
              <EmptyPanel
                icon="person_search"
                title="No organizers match"
                description={params.q ? `Nothing matches “${params.q}”. Try part of an email or workspace name.` : 'No accounts in this group yet.'}
              />
            ) : (
              <>
                <div className="ds-table-wrap">
                  <table className="ds-table min-w-[860px]">
                    <thead>
                      <tr>
                        <th scope="col">Account</th>
                        <th scope="col">Workspaces</th>
                        <th scope="col" className="text-right">Events</th>
                        <th scope="col">Joined</th>
                        <th scope="col">Last sign-in</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.items.map((o) => (
                        <tr key={o.id}>
                          <td className="max-w-[280px]">
                            <Link href={`/super-admin/organizers/${o.id}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ds-accent">
                              <span className="block truncate font-medium text-ds-ink hover:text-ds-accent">{o.name || o.email || 'Unnamed account'}</span>
                              {o.name && <span className="block truncate text-[12px] text-ds-muted">{o.email}</span>}
                            </Link>
                          </td>
                          <td className="max-w-[240px]">
                            {o.workspaces.length === 0 ? (
                              <span className="text-ds-muted">None</span>
                            ) : (
                              <span className="block truncate" title={o.workspaces.map((w) => `${w.name} (${roleLabel(w.role)})`).join(', ')}>
                                {o.workspaces[0].name}
                                <span className="text-ds-muted"> {roleLabel(o.workspaces[0].role).toLowerCase()}</span>
                                {o.workspaces.length > 1 && <span className="text-ds-muted">, +{o.workspaces.length - 1}</span>}
                              </span>
                            )}
                          </td>
                          <td className="text-right tabular-nums">
                            {o.eventCount}
                            {o.liveEventCount > 0 && <span className="text-ds-muted"> ({o.liveEventCount} live)</span>}
                          </td>
                          <td className="whitespace-nowrap text-ds-muted">{fmtDate(o.createdAt)}</td>
                          <td className="whitespace-nowrap text-ds-muted">{fmtAgo(o.lastSignInAt)}</td>
                          <td>
                            <span className="flex flex-wrap gap-1.5">
                              <StatusPill tone={STATUS_PILL[o.status].tone}>{STATUS_PILL[o.status].label}</StatusPill>
                              {o.isPlatformAdmin && <StatusPill tone="brand" dot={false}>Admin</StatusPill>}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager base="/super-admin/organizers" params={params} page={result.data.page} pageSize={result.data.pageSize} total={result.data.total} noun="accounts" />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
