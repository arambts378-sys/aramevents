import React from 'react';
import Link from 'next/link';
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
      value: summary.totalWorkspaces,
      subtext: `${summary.suspendedWorkspaces} suspended`,
      icon: 'corporate_fare',
      color: 'text-[#7C5CFC]',
      bg: 'bg-[#7C5CFC]/10',
    },
    {
      label: 'Total Organizers',
      value: summary.totalOrganizers,
      subtext: 'Unique workspace owners',
      icon: 'badge',
      color: 'text-[#6366F1]',
      bg: 'bg-[#6366F1]/10',
    },
    {
      label: 'Total Events',
      value: summary.totalEvents,
      subtext: `${summary.publishedEvents} published · ${summary.draftEvents} draft`,
      icon: 'calendar_month',
      color: 'text-[#0284C7]',
      bg: 'bg-[#0284C7]/10',
    },
    {
      label: 'Live Events',
      value: summary.liveEvents,
      subtext: 'Currently active today',
      icon: 'sensors',
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
    },
    {
      label: 'Total Registrations',
      value: summary.totalRegistrations,
      subtext: 'Cross-platform tickets & RSVPs',
      icon: 'how_to_reg',
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
    },
    {
      label: 'Moderated Events',
      value: summary.moderatedEvents,
      subtext: 'Flagged or suspended events',
      icon: 'policy',
      color: summary.moderatedEvents > 0 ? 'text-[#BA1A1A]' : 'text-[#77738A]',
      bg: summary.moderatedEvents > 0 ? 'bg-[#FFDAD6]/40' : 'bg-[#E6E2F0]/40',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#7C5CFC]">
            Platform Operations
          </p>
          <h1 className="mt-1 font-space text-2xl sm:text-3xl font-bold tracking-tight text-[#17152B]">
            Master Admin Console
          </h1>
          <p className="mt-1 text-sm text-[#77738A]">
            Platform-wide governance, workspace supervision, and security oversight.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/super-admin/organizers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-[#E6E2F0] hover:bg-[#F6F1FF] text-[#17152B] transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
            <span>Organizers</span>
          </Link>
          <Link
            href="/super-admin/events"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] text-white hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">event</span>
            <span>Global Events</span>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <section aria-label="System Metrics" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-[#E6E2F0] p-4 flex flex-col justify-between shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#77738A] leading-tight">
                {kpi.label}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
                <span className={`material-symbols-outlined text-[18px] ${kpi.color}`}>
                  {kpi.icon}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <p className="font-space text-2xl font-bold text-[#17152B] tabular-nums">
                {kpi.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] text-[#77738A] truncate font-medium">
                {kpi.subtext}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Quick Navigation Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            className="group bg-white rounded-2xl border border-[#E6E2F0] p-4 hover:border-[#7C5CFC]/40 transition-all flex items-start gap-3.5 shadow-2xs hover:shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center shrink-0 group-hover:bg-gradient-to-br group-hover:from-[#7C5CFC] group-hover:to-[#6366F1] group-hover:text-white transition-all shadow-xs">
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#17152B] group-hover:text-[#7C5CFC] transition-colors leading-tight">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-[#77738A] leading-relaxed line-clamp-2">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {/* Two Column Layout: Recent Workspaces & Events + Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recently Created Workspaces */}
          <div className="bg-white rounded-2xl border border-[#E6E2F0] overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-[#E6E2F0] flex items-center justify-between">
              <div>
                <h2 className="font-space text-base font-bold text-[#17152B]">
                  Recent Workspaces
                </h2>
                <p className="text-xs text-[#77738A]">Latest organizer workspace registrations</p>
              </div>
              <Link
                href="/super-admin/organizers"
                className="text-xs font-semibold text-[#7C5CFC] hover:underline"
              >
                View all →
              </Link>
            </div>
            {recentWorkspaces.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#77738A]">
                No workspaces registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8FF] text-[#77738A] font-semibold border-b border-[#E6E2F0]">
                    <tr>
                      <th className="px-4 py-3">Workspace</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDF8]">
                    {recentWorkspaces.map((w) => (
                      <tr key={w.id} className="hover:bg-[#F9F7FF] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#17152B]">
                          <Link
                            href={`/super-admin/customers/${w.id}`}
                            className="hover:text-[#7C5CFC] hover:underline"
                          >
                            {w.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#5A566B]">
                          {w.owner_name || w.owner_email || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {w.is_suspended ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFDAD6] text-[#BA1A1A]">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#77738A] whitespace-nowrap">
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
          <div className="bg-white rounded-2xl border border-[#E6E2F0] overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-[#E6E2F0] flex items-center justify-between">
              <div>
                <h2 className="font-space text-base font-bold text-[#17152B]">
                  Recent Events
                </h2>
                <p className="text-xs text-[#77738A]">Events created across all tenant workspaces</p>
              </div>
              <Link
                href="/super-admin/events"
                className="text-xs font-semibold text-[#7C5CFC] hover:underline"
              >
                View all →
              </Link>
            </div>
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#77738A]">
                No events found in workspace catalog.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8FF] text-[#77738A] font-semibold border-b border-[#E6E2F0]">
                    <tr>
                      <th className="px-4 py-3">Event Name</th>
                      <th className="px-4 py-3">Workspace</th>
                      <th className="px-4 py-3">Lifecycle</th>
                      <th className="px-4 py-3">Start Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDF8]">
                    {recentEvents.map((e) => (
                      <tr key={e.id} className="hover:bg-[#F9F7FF] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#17152B]">
                          {e.name}
                        </td>
                        <td className="px-4 py-3 text-[#5A566B]">
                          {e.workspace_name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              e.status === 'published'
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : e.status === 'draft'
                                ? 'bg-[#EDE9FE] text-[#7C5CFC]'
                                : 'bg-[#E5E7EB] text-[#4B5563]'
                            }`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#77738A] whitespace-nowrap">
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
          <div className="bg-white rounded-2xl border border-[#E6E2F0] p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6E2F0]">
              <div>
                <h2 className="font-space text-base font-bold text-[#17152B]">
                  Administrative Audit
                </h2>
                <p className="text-xs text-[#77738A]">Recent privileged actions</p>
              </div>
              <Link
                href="/super-admin/audit-logs"
                className="text-xs font-semibold text-[#7C5CFC] hover:underline"
              >
                Log history →
              </Link>
            </div>

            {recentAudits.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#77738A]">
                No administrative actions recorded yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentAudits.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E6E2F0] text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[11px] text-[#7C5CFC] truncate">
                        {a.action}
                      </span>
                      <span className="text-[10px] text-[#77738A] whitespace-nowrap">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    {a.reason && (
                      <p className="text-[#17152B] text-xs line-clamp-2">
                        {a.reason}
                      </p>
                    )}
                    <span className="text-[10px] text-[#77738A] truncate">
                      By: {a.actor_email || 'System / Operator'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#7C5CFC]/10 to-[#6366F1]/10 rounded-2xl border border-[#7C5CFC]/20 p-5">
            <div className="flex items-center gap-2 text-[#7C5CFC]">
              <span className="material-symbols-outlined text-[20px]">shield</span>
              <span className="text-xs font-bold uppercase tracking-wider">
                Multi-Tenant Isolation
              </span>
            </div>
            <p className="mt-2 text-xs text-[#5A566B] leading-relaxed">
              Row Level Security (RLS) is active across all tenant tables. Master admin access uses strictly vetted, security-definer procedures without exposing direct database writes to browsers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
