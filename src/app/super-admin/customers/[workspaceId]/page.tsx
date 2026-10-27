import Link from 'next/link';
import { getCustomerDetail } from '@/services/superAdminCustomers.server';
import { getPageCount, parsePositivePage } from '@/lib/super-admin/customerDirectory';

type SearchParams = Record<string, string | string[] | undefined>;

function formatDate(value: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function toPageHref(workspaceId: string, memberPage: number, eventPage: number): string {
  const params = new URLSearchParams();
  if (memberPage > 1) params.set('memberPage', String(memberPage));
  if (eventPage > 1) params.set('eventPage', String(eventPage));
  const query = params.toString();
  return `/super-admin/customers/${workspaceId}${query ? `?${query}` : ''}`;
}

function Pager({
  label,
  page,
  total,
  workspaceId,
  memberPage,
  eventPage,
}: {
  label: string;
  page: number;
  total: number;
  workspaceId: string;
  memberPage: number;
  eventPage: number;
}) {
  const pages = getPageCount(total, 20);
  const previousMemberPage = label === 'members' ? page - 1 : memberPage;
  const nextMemberPage = label === 'members' ? page + 1 : memberPage;
  const previousEventPage = label === 'events' ? page - 1 : eventPage;
  const nextEventPage = label === 'events' ? page + 1 : eventPage;

  return (
    <nav aria-label={`${label} pagination`} className="mt-4 flex items-center justify-between gap-3 border-t border-ds-line pt-3">
      <span className="text-xs text-ds-muted">Page {page} of {pages} · {total.toLocaleString()} total</span>
      <div className="flex gap-2">
        {[
          { text: 'Previous', disabled: page <= 1, memberPage: previousMemberPage, eventPage: previousEventPage },
          { text: 'Next', disabled: page >= pages, memberPage: nextMemberPage, eventPage: nextEventPage },
        ].map((control) => (
          <Link
            key={control.text}
            aria-disabled={control.disabled}
            tabIndex={control.disabled ? -1 : undefined}
            href={toPageHref(workspaceId, control.memberPage, control.eventPage)}
            className={`rounded-lg border border-ds-line-strong px-3 py-1.5 text-xs font-semibold ${control.disabled ? 'pointer-events-none opacity-50' : 'hover:bg-ds-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent'}`}
          >
            {control.text}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default async function SuperAdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ workspaceId }, query] = await Promise.all([params, searchParams]);
  const memberPage = parsePositivePage(query.memberPage);
  const eventPage = parsePositivePage(query.eventPage);
  const result = await getCustomerDetail(workspaceId, memberPage, eventPage);

  if (!result.ok) {
    return (
      <section className="ds-card p-6" role="alert">
        <h1 className="font-space text-xl font-bold">Customer organization unavailable</h1>
        <p className="mt-2 text-sm text-ds-muted">{result.message}</p>
        <Link href="/super-admin/customers" className="mt-4 inline-flex text-sm font-semibold text-ds-accent-strong hover:underline">Back to customers</Link>
      </section>
    );
  }

  const { organization, members, events } = result.data;
  const plan = organization.planId.charAt(0).toUpperCase() + organization.planId.slice(1);
  const overrides = organization.entitlementOverrides
    ? Object.entries(organization.entitlementOverrides)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/super-admin/customers" className="text-sm font-semibold text-ds-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent">
          ← Customer organizations
        </Link>
        <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-ds-accent">Customer 360</p>
            <h1 className="mt-1 break-words font-space text-2xl font-bold tracking-tight sm:text-3xl">{organization.name}</h1>
            <p className="mt-2 break-all font-mono text-xs text-ds-muted">{organization.id}</p>
          </div>
          <span className="inline-flex w-fit shrink-0 rounded-full bg-ds-accent-soft px-3 py-1.5 text-sm font-semibold text-ds-accent-strong">
            {organization.hasSubscription ? plan : `${plan} · default`}
          </span>
        </header>
        <Link
          href={`/super-admin/activity?workspace=${encodeURIComponent(organization.id)}`}
          className="mt-4 inline-flex rounded-lg border border-ds-line-strong bg-white px-3 py-2 text-sm font-semibold text-ds-accent-strong hover:bg-ds-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        >
          View workspace activity
        </Link>
      </div>

      <section aria-labelledby="organization-overview" className="ds-card p-5 sm:p-6">
        <h2 id="organization-overview" className="font-space text-lg font-bold">Organization overview</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Owner</dt><dd className="mt-1 break-words text-sm font-medium">{organization.ownerName || 'Owner profile unavailable'}</dd>{organization.ownerEmail && <dd className="mt-1 break-all text-xs text-ds-muted">{organization.ownerEmail}</dd>}</div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Created</dt><dd className="mt-1 text-sm font-medium">{formatDate(organization.createdAt)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Members</dt><dd className="mt-1 text-sm font-medium tabular-nums">{organization.memberCount.toLocaleString()}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Events</dt><dd className="mt-1 text-sm font-medium tabular-nums">{organization.eventCount.toLocaleString()}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="team-members" className="ds-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="team-members" className="font-space text-lg font-bold">Users and team</h2>
            <p className="mt-1 text-sm text-ds-muted">Workspace role and membership join date.</p>
          </div>
          <span className="text-xs text-ds-muted">No separate membership status is stored.</span>
        </div>
        {members.length === 0 ? (
          <p className="mt-5 rounded-lg bg-ds-canvas p-4 text-sm text-ds-muted">No members are associated with this workspace.</p>
        ) : (
          <div className="mt-4 divide-y divide-ds-line">
            {members.map((member) => (
              <article key={member.userId} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{member.name || 'Profile unavailable'}</p>
                  {member.email && <p className="mt-0.5 break-all text-sm text-ds-muted">{member.email}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-xs text-ds-muted">
                  <span className="rounded-full bg-ds-accent-soft px-2.5 py-1 font-semibold text-ds-accent-strong">{member.role || 'Role unavailable'}</span>
                  <span className="self-center">Joined {formatDate(member.joinedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pager label="members" page={result.data.memberPage} total={result.data.membersTotal} workspaceId={workspaceId} memberPage={result.data.memberPage} eventPage={result.data.eventPage} />
      </section>

      <section aria-labelledby="customer-events" className="ds-card p-5 sm:p-6">
        <div>
          <h2 id="customer-events" className="font-space text-lg font-bold">Events</h2>
          <p className="mt-1 text-sm text-ds-muted">Events associated with this workspace.</p>
        </div>
        {events.length === 0 ? (
          <p className="mt-5 rounded-lg bg-ds-canvas p-4 text-sm text-ds-muted">No events are associated with this workspace.</p>
        ) : (
          <div className="mt-4 divide-y divide-ds-line">
            {events.map((event) => (
              <article key={event.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/app/events/${event.id}`} className="break-words text-sm font-semibold text-ds-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent">
                    {event.name}
                  </Link>
                  <p className="mt-1 text-xs text-ds-muted">Event ID: <span className="font-mono">{event.id}</span></p>
                </div>
                <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ds-muted">
                  <div><dt className="inline text-ds-muted">Date: </dt><dd className="inline">{formatDate(event.startDate)}</dd></div>
                  <div><dt className="inline text-ds-muted">Status: </dt><dd className="inline">{event.status}</dd></div>
                  <div><dt className="inline text-ds-muted">Created: </dt><dd className="inline">{formatDate(event.createdAt)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
        <Pager label="events" page={result.data.eventPage} total={result.data.eventsTotal} workspaceId={workspaceId} memberPage={result.data.memberPage} eventPage={result.data.eventPage} />
      </section>

      <section aria-labelledby="customer-subscription" className="ds-card p-5 sm:p-6">
        <h2 id="customer-subscription" className="font-space text-lg font-bold">Subscription</h2>
        {!organization.hasSubscription ? (
          <p className="mt-3 rounded-lg bg-ds-canvas p-4 text-sm leading-relaxed text-ds-muted">
            No subscription row is stored. The existing plan service resolves this workspace to the default Free plan; this is not a persisted subscription.
          </p>
        ) : (
          <>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Stored plan</dt><dd className="mt-1 text-sm font-medium">{plan}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Status</dt><dd className="mt-1 text-sm font-medium">{organization.subscriptionStatus || 'Unavailable'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Billing interval</dt><dd className="mt-1 text-sm font-medium">{organization.billingInterval || 'Not set'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Renewal / period end</dt><dd className="mt-1 text-sm font-medium">{formatDate(organization.currentPeriodEnd)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Period start</dt><dd className="mt-1 text-sm font-medium">{formatDate(organization.currentPeriodStart)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Trial ends</dt><dd className="mt-1 text-sm font-medium">{formatDate(organization.trialEndsAt)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-ds-muted">Cancel at period end</dt><dd className="mt-1 text-sm font-medium">{organization.cancelAtPeriodEnd === null ? 'Unavailable' : organization.cancelAtPeriodEnd ? 'Yes' : 'No'}</dd></div>
            </dl>
            {overrides.length > 0 && (
              <div className="mt-5 border-t border-ds-line pt-4">
                <h3 className="text-sm font-semibold">Stored entitlement overrides</h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {overrides.map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-ds-canvas p-3">
                      <dt className="text-xs text-ds-muted">{key}</dt>
                      <dd className="mt-1 break-words text-sm font-medium">{typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="support-context" className="ds-card p-5 sm:p-6">
        <h2 id="support-context" className="font-space text-lg font-bold">Support context</h2>
        <p className="mt-2 text-sm text-ds-muted">No support history is available in this phase.</p>
      </section>
    </div>
  );
}
