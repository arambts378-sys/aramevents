import React from 'react';
import Link from 'next/link';
import { EmptyPanel, PageHeader, Panel, StatusPill } from '@/components/ui';
import { fmtAgo, fmtDate } from '@/components/super-admin/fmt';
import { getOverview } from '@/services/superAdminLive.server';

function Figure({ label, value, note, href }: { label: string; value: number; note?: string; href?: string }) {
  const body = (
    <>
      <dt className="text-[13px] text-ds-muted">{label}</dt>
      <dd className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ds-ink">{value.toLocaleString('en')}</dd>
      {note && <dd className="mt-2 text-[12px] text-ds-muted">{note}</dd>}
    </>
  );
  return href ? (
    <Link href={href} className="block bg-ds-surface px-5 py-4 transition-colors hover:bg-ds-subtle focus-visible:outline-2 focus-visible:outline-ds-accent">
      {body}
    </Link>
  ) : (
    <div className="bg-ds-surface px-5 py-4">{body}</div>
  );
}

export default async function SuperAdminOverviewPage() {
  const result = await getOverview();

  if (!result.ok) {
    return <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load the overview" description={result.message} /></div>;
  }

  const { counts, upcoming, newestOrganizers, recentAudits } = result.data;

  const attention = [
    counts.unverified > 0 && {
      text: `${counts.unverified} organizer ${counts.unverified === 1 ? 'account hasn’t' : 'accounts haven’t'} verified their email`,
      href: '/super-admin/organizers?status=unverified',
      tone: 'warning' as const,
    },
    counts.blocked > 0 && {
      text: `${counts.blocked} ${counts.blocked === 1 ? 'account is' : 'accounts are'} blocked from signing in`,
      href: '/super-admin/organizers?status=blocked',
      tone: 'danger' as const,
    },
    counts.suspendedWorkspaces && {
      text: `${counts.suspendedWorkspaces} ${counts.suspendedWorkspaces === 1 ? 'workspace is' : 'workspaces are'} suspended`,
      href: '/super-admin/organizers',
      tone: 'danger' as const,
    },
    counts.suspendedWorkspaces === null && {
      text: 'Workspace suspension and monitoring need the setup SQL to be run in Supabase',
      href: '/super-admin/monitoring',
      tone: 'warning' as const,
    },
  ].filter(Boolean) as Array<{ text: string; href: string; tone: 'warning' | 'danger' }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="What’s happening across every organizer and event on Aram right now."
        actions={
          <>
            <Link href="/super-admin/organizers" className="ds-btn ds-btn-secondary">Organizers</Link>
            <Link href="/super-admin/events" className="ds-btn ds-btn-primary">Events</Link>
          </>
        }
      />

      <section aria-label="Today" className="ds-card overflow-hidden">
        <dl className="grid grid-cols-2 gap-px bg-ds-line lg:grid-cols-4">
          <Figure label="Checked in today" value={counts.checkInsToday} note="Allowed scans since midnight UTC" />
          <Figure label="Registrations, last 7 days" value={counts.registrations7d} note={`${counts.registrations.toLocaleString('en')} all time`} />
          <Figure label="Live events" value={counts.published} note={`${counts.upcoming} upcoming, ${counts.drafts} in draft`} href="/super-admin/events?status=published" />
          <Figure label="Organizer accounts" value={counts.organizers} note={`${counts.newOrganizers30d} new in 30 days, ${counts.workspaces} workspaces`} href="/super-admin/organizers" />
        </dl>
      </section>

      {attention.length > 0 && (
        <section aria-label="Needs attention" className="space-y-2">
          {attention.map((a) => (
            <Link
              key={a.text}
              href={a.href}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] transition-colors ${
                a.tone === 'danger'
                  ? 'border-ds-danger/25 bg-ds-danger-soft text-ds-danger hover:border-ds-danger/50'
                  : 'border-ds-warning/25 bg-ds-warning-soft text-ds-warning hover:border-ds-warning/50'
              }`}
            >
              <span>{a.text}</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
            </Link>
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel
          flush
          className="xl:col-span-3"
          title="Coming up"
          description="The next events on the calendar across all workspaces."
          action={<Link href="/super-admin/events?when=upcoming" className="text-[13px] font-medium text-ds-accent hover:underline">All upcoming</Link>}
        >
          {upcoming.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ds-muted">Nothing scheduled yet.</p>
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table min-w-[520px]">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Event</th>
                    <th scope="col" className="text-right">Registrations</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap font-medium text-ds-ink">{fmtDate(e.startDate)}</td>
                      <td>
                        <span className="block font-medium text-ds-ink">{e.name}</span>
                        <span className="block text-[12px] text-ds-muted">{e.workspaceName}</span>
                      </td>
                      <td className="text-right tabular-nums">{e.registrations.toLocaleString('en')}</td>
                      <td>
                        <StatusPill tone={e.status === 'published' ? 'success' : 'brand'}>{e.status === 'published' ? 'Live' : 'Draft'}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Newest organizers"
          action={<Link href="/super-admin/organizers" className="text-[13px] font-medium text-ds-accent hover:underline">All organizers</Link>}
        >
          {newestOrganizers.length === 0 ? (
            <p className="text-[13px] text-ds-muted">No sign-ups yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-ds-line">
              {newestOrganizers.map((o) => (
                <li key={o.id}>
                  <Link href={`/super-admin/organizers/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-ds-accent">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-ds-ink">{o.name || o.email}</span>
                      <span className="block truncate text-[12px] text-ds-muted">{o.workspaceName ?? 'No workspace yet'}, joined {fmtAgo(o.createdAt)}</span>
                    </span>
                    {!o.verified && <StatusPill tone="warning">Not verified</StatusPill>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent admin actions"
        action={<Link href="/super-admin/audit-logs" className="text-[13px] font-medium text-ds-accent hover:underline">Audit log</Link>}
      >
        {recentAudits.length === 0 ? (
          <p className="text-[13px] text-ds-muted">No admin actions recorded yet.</p>
        ) : (
          <ul className="-my-2 divide-y divide-ds-line">
            {recentAudits.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 py-2.5 text-[13px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="text-ds-ink">
                  {a.action.replace(/[._]/g, ' ')}
                  {a.reason && <span className="text-ds-muted"> “{a.reason}”</span>}
                </span>
                <span className="shrink-0 text-[12px] text-ds-muted">{a.actorEmail ?? 'An admin'}, {fmtAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
