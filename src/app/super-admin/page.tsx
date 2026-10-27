import React from 'react';
import Link from 'next/link';
import { PageHeader, StatCard, type StatTone } from '@/components/ui';
import { getPlatformOverview } from '@/services/superAdminPortal.server';

function formatDate(val: string) {
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export default async function SuperAdminOverviewPage() {
  const result = await getPlatformOverview();

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-[#FCA5A5]/40 bg-[#FEF2F2] p-6 text-[#991B1B]">
        <h1 className="font-space text-xl font-bold">System Error</h1>
        <p className="mt-2 text-sm">{result.message}</p>
      </div>
    );
  }

  const { summary, recentWorkspaces, recentEvents, recentAudits } = result.data;

  const kpis = [
    {
      label: 'Total Workspaces',
      tone: 'accent' as StatTone,
      value: summary.totalWorkspaces,
      subtext: `${summary.suspendedWorkspaces} suspended`,
      icon: 'corporate_fare',
    },
    {
      label: 'Total Organizers',
      tone: 'indigo' as StatTone,
      value: summary.totalOrganizers,
      subtext: 'Unique workspace owners',
      icon: 'badge',
    },
    {
      label: 'Total Events',
      tone: 'info' as StatTone,
      value: summary.totalEvents,
      subtext: `${summary.publishedEvents} published · ${summary.draftEvents} draft`,
      icon: 'calendar_month',
    },
    {
      label: 'Live Events',
      tone: 'success' as StatTone,
      value: summary.liveEvents,
      subtext: 'Currently active today',
      icon: 'sensors',
    },
    {
      label: 'Total Registrations',
      tone: 'warning' as StatTone,
      value: summary.totalRegistrations,
      subtext: 'Cross-platform tickets & RSVPs',
      icon: 'how_to_reg',
    },
    {
      label: 'Moderated Events',
      tone: (summary.moderatedEvents > 0 ? 'danger' : 'neutral') as StatTone,
      value: summary.moderatedEvents,
      subtext: 'Flagged or suspended events',
      icon: 'policy',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Platform Operations"
        title="Master Admin Console"
        description="Platform-wide governance, workspace supervision, and security oversight."
        actions={
          <>
            <Link href="/super-admin/organizers" className="ds-btn ds-btn-secondary">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">corporate_fare</span>
              Organizers
            </Link>
            <Link href="/super-admin/events" className="ds-btn ds-btn-primary">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event</span>
              Global Events
            </Link>
          </>
        }
      />

      <section aria-label="System Metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value.toLocaleString()}
            hint={kpi.subtext}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </section>

      {/* Quick Navigation Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {[
          {
            title: 'Organizer Directory',
            desc: 'Inspect workspaces, accounts & suspension status',
            href: '/super-admin/organizers',
            icon: 'corporate_fare',
          },
          {
            title: 'Global Event Moderation',
            desc: 'Review, suspend, flag or restore events',
            href: '/super-admin/events',
            icon: 'calendar_month',
          },
          {
            title: 'Platform Analytics',
            desc: 'Operational metrics and growth trends',
            href: '/super-admin/analytics',
            icon: 'monitoring',
          },
          {
            title: 'Security Audit Logs',
            desc: 'Append-only record of administrative actions',
            href: '/super-admin/audit-logs',
            icon: 'security',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group ds-card ds-card-hover p-4 flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-ds-accent-soft text-ds-accent flex items-center justify-center shrink-0 group-hover:bg-gradient-to-br group-hover:from-ds-accent group-hover:to-[#6366F1] group-hover:text-white transition-all shadow-xs">
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ds-ink group-hover:text-ds-accent transition-colors leading-tight">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-ds-muted leading-relaxed line-clamp-2">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {/* Two Column Layout: Recent Workspaces & Events + Recent Audits */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          {/* Recently Created Workspaces */}
          <div className="ds-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-ds-line flex items-center justify-between">
              <div>
                <h2 className="font-space text-base font-bold text-ds-ink">
                  Recent Workspaces
                </h2>
                <p className="text-xs text-ds-muted">Latest organizer workspace registrations</p>
              </div>
              <Link
                href="/super-admin/organizers"
                className="text-xs font-semibold text-ds-accent hover:underline"
              >
                View all →
              </Link>
            </div>
            {recentWorkspaces.length === 0 ? (
              <div className="p-8 text-center text-sm text-ds-muted">
                No workspaces registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th scope="col">Workspace</th>
                      <th scope="col">Owner</th>
                      <th scope="col">Status</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentWorkspaces.map((w) => (
                      <tr key={w.id}>
                        <td className="font-semibold text-ds-ink">
                          <Link
                            href={`/super-admin/customers/${w.id}`}
                            className="hover:text-ds-accent hover:underline"
                          >
                            {w.name}
                          </Link>
                        </td>
                        <td>
                          {w.owner_name || w.owner_email || '—'}
                        </td>
                        <td>
                          {w.is_suspended ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFDAD6] text-ds-danger">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-ds-muted">
                          {formatDate(w.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recently Created Events */}
          <div className="ds-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-ds-line flex items-center justify-between">
              <div>
                <h2 className="font-space text-base font-bold text-ds-ink">
                  Recent Events
                </h2>
                <p className="text-xs text-ds-muted">Events created across all tenant workspaces</p>
              </div>
              <Link
                href="/super-admin/events"
                className="text-xs font-semibold text-ds-accent hover:underline"
              >
                View all →
              </Link>
            </div>
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-ds-muted">
                No events found in workspace catalog.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th scope="col">Event Name</th>
                      <th scope="col">Workspace</th>
                      <th scope="col">Lifecycle</th>
                      <th scope="col">Start Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((e) => (
                      <tr key={e.id}>
                        <td className="font-semibold text-ds-ink">
                          {e.name}
                        </td>
                        <td>
                          {e.workspace_name}
                        </td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              e.status === 'published'
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : e.status === 'draft'
                                ? 'bg-ds-accent-soft text-ds-accent'
                                : 'bg-ds-line text-ds-body'
                            }`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-ds-muted">
                          {e.start_date || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Administrative & Security Activity */}
        <div className="space-y-6">
          <div className="ds-card p-4 sm:p-5">
            <div className="flex items-center justify-between pb-4 border-b border-ds-line">
              <div>
                <h2 className="font-space text-base font-bold text-ds-ink">
                  Administrative Audit
                </h2>
                <p className="text-xs text-ds-muted">Recent privileged actions</p>
              </div>
              <Link
                href="/super-admin/audit-logs"
                className="text-xs font-semibold text-ds-accent hover:underline"
              >
                Log history →
              </Link>
            </div>

            {recentAudits.length === 0 ? (
              <div className="py-8 text-center text-xs text-ds-muted">
                No administrative actions recorded yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentAudits.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-ds-subtle border border-ds-line text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[11px] text-ds-accent truncate">
                        {a.action}
                      </span>
                      <span className="text-[10px] text-ds-muted whitespace-nowrap">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    {a.reason && (
                      <p className="text-ds-ink text-xs line-clamp-2">
                        {a.reason}
                      </p>
                    )}
                    <span className="text-[10px] text-ds-muted truncate">
                      By: {a.actor_email || 'System / Operator'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-ds-accent-soft rounded-2xl border border-ds-accent/20 p-5">
            <div className="flex items-center gap-2 text-ds-accent">
              <span className="material-symbols-outlined text-[20px]">shield</span>
              <span className="text-xs font-bold uppercase tracking-wider">
                Multi-Tenant Isolation
              </span>
            </div>
            <p className="mt-2 text-xs text-ds-muted leading-relaxed">
              Row Level Security (RLS) is active across all tenant tables. Master admin access uses strictly vetted, security-definer procedures without exposing direct database writes to browsers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
