import React from 'react';
import Link from 'next/link';
import { EmptyPanel, PageHeader, StatusPill } from '@/components/ui';
import { FilterTabs, Pager, SearchBox } from '@/components/super-admin/Pager';
import { ActionDialog } from '@/components/super-admin/controls/ActionDialog';
import { fmtDate } from '@/components/super-admin/fmt';
import { listEvents } from '@/services/superAdminLive.server';
import { setEventStatusAction } from '@/app/actions/superAdminActions';

type SearchParams = Record<string, string | string[] | undefined>;

const TONE: Record<string, 'success' | 'brand' | 'neutral'> = { published: 'success', draft: 'brand', archived: 'neutral' };
const LABEL: Record<string, string> = { published: 'Live', draft: 'Draft', archived: 'Archived' };

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const params = {
    q: typeof raw.q === 'string' ? raw.q : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    when: typeof raw.when === 'string' ? raw.when : undefined,
  };
  const page = Math.max(1, Number(raw.page) || 1);
  const result = await listEvents({ ...params, page });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        description="Every event on Aram, across all workspaces. Take an event offline if it breaks the rules or was published by mistake."
      />

      {!result.ok ? (
        <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load events" description={result.message} /></div>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <FilterTabs
                base="/super-admin/events"
                params={params}
                name="status"
                active={params.status ?? 'all'}
                options={[
                  { value: 'all', label: 'All', count: result.data.counts.all },
                  { value: 'published', label: 'Live', count: result.data.counts.published },
                  { value: 'draft', label: 'Draft', count: result.data.counts.draft },
                  { value: 'archived', label: 'Archived', count: result.data.counts.archived },
                ]}
              />
              <FilterTabs
                base="/super-admin/events"
                params={params}
                name="when"
                active={params.when ?? 'all'}
                options={[
                  { value: 'all', label: 'Any date' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'past', label: 'Past' },
                ]}
              />
            </div>
            <SearchBox base="/super-admin/events" params={params} placeholder="Search event or workspace" />
          </div>

          <section className="ds-card overflow-hidden">
            {result.data.items.length === 0 ? (
              <EmptyPanel icon="event_busy" title="No events match" description="Try a different filter or search." />
            ) : (
              <>
                <div className="ds-table-wrap">
                  <table className="ds-table min-w-[960px]">
                    <thead>
                      <tr>
                        <th scope="col">Event</th>
                        <th scope="col">Organizer</th>
                        <th scope="col">Date</th>
                        <th scope="col" className="text-right">Registrations</th>
                        <th scope="col" className="text-right">Checked in</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.items.map((e) => (
                        <tr key={e.id}>
                          <td className="max-w-[280px]">
                            <span className="block truncate font-medium text-ds-ink">{e.name}</span>
                            <span className="block truncate text-[12px] text-ds-muted">
                              {[e.type, e.location].filter(Boolean).join(', ') || e.slug}
                            </span>
                          </td>
                          <td className="max-w-[220px]">
                            {e.ownerId ? (
                              <Link href={`/super-admin/organizers/${e.ownerId}`} className="block truncate text-ds-ink hover:text-ds-accent">{e.workspaceName}</Link>
                            ) : (
                              <span className="block truncate">{e.workspaceName}</span>
                            )}
                            <span className="block truncate text-[12px] text-ds-muted">{e.ownerEmail}</span>
                          </td>
                          <td className="whitespace-nowrap text-ds-muted">{fmtDate(e.startDate)}</td>
                          <td className="text-right tabular-nums">{e.registrations.toLocaleString('en')}</td>
                          <td className="text-right tabular-nums">
                            {e.checkIns.toLocaleString('en')}
                            {e.registrations > 0 && e.checkIns > 0 && (
                              <span className="text-ds-muted"> ({Math.round((e.checkIns / e.registrations) * 100)}%)</span>
                            )}
                          </td>
                          <td><StatusPill tone={TONE[e.status] ?? 'neutral'}>{LABEL[e.status] ?? e.status}</StatusPill></td>
                          <td>
                            <span className="flex flex-wrap justify-end gap-1">
                              {e.status === 'published' && (
                                <a href={`/events/${e.slug}`} target="_blank" rel="noreferrer" className="ds-btn ds-btn-ghost ds-btn-sm">View</a>
                              )}
                              {e.status === 'published' ? (
                                <ActionDialog
                                  label="Unpublish"
                                  variant="ghost"
                                  tone="danger"
                                  title={`Take ${e.name} offline?`}
                                  description="The public page and registration form stop working. Registrations and tickets are kept."
                                  reason="required"
                                  action={setEventStatusAction.bind(null, e.id, 'draft')}
                                />
                              ) : (
                                <ActionDialog
                                  label="Publish"
                                  variant="ghost"
                                  title={`Publish ${e.name}?`}
                                  description="The public page and registration form go live."
                                  reason="optional"
                                  action={setEventStatusAction.bind(null, e.id, 'published')}
                                />
                              )}
                              {e.status !== 'archived' && (
                                <ActionDialog
                                  label="Archive"
                                  variant="ghost"
                                  title={`Archive ${e.name}?`}
                                  description="It disappears from the organizer’s active list and the public site. Data is kept."
                                  reason="required"
                                  action={setEventStatusAction.bind(null, e.id, 'archived')}
                                />
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager base="/super-admin/events" params={params} page={result.data.page} pageSize={result.data.pageSize} total={result.data.total} noun="events" />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
