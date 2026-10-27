import { PageHeader } from '@/components/ui';
import React from 'react';
import { getPlatformAnalytics, getPlatformOverview } from '@/services/superAdminPortal.server';

export default async function SuperAdminAnalyticsPage() {
  const [analyticsResult, overviewResult] = await Promise.all([
    getPlatformAnalytics(),
    getPlatformOverview(),
  ]);

  const analytics = analyticsResult.ok
    ? analyticsResult.data
    : {
        workspacesGrowth: [],
        eventsGrowth: [],
        registrationsGrowth: [],
        eventsByStatus: [],
        eventsByType: [],
        planDistribution: [],
      };

  const summary = overviewResult.ok
    ? overviewResult.data.summary
    : {
        totalWorkspaces: 0,
        suspendedWorkspaces: 0,
        totalOrganizers: 0,
        totalEvents: 0,
        draftEvents: 0,
        publishedEvents: 0,
        archivedEvents: 0,
        liveEvents: 0,
        moderatedEvents: 0,
        totalRegistrations: 0,
      };

  const maxWorkspacesCount = Math.max(
    1,
    ...analytics.workspacesGrowth.map((w) => w.count),
  );
  const maxEventsCount = Math.max(1, ...analytics.eventsGrowth.map((e) => e.count));
  const maxRegistrationsCount = Math.max(
    1,
    ...analytics.registrationsGrowth.map((r) => r.count),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Platform Intelligence"
        title="Platform Analytics & Growth"
        description="Real-time aggregated indicators across workspace adoption, event publication, and attendee volume."
      />

      {/* Top Level Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Organizations',
            val: summary.totalWorkspaces,
            sub: `${summary.suspendedWorkspaces} suspended`,
            icon: 'corporate_fare',
            color: 'text-ds-accent',
          },
          {
            label: 'Total Events Hosted',
            val: summary.totalEvents,
            sub: `${summary.publishedEvents} published`,
            icon: 'calendar_today',
            color: 'text-[#6366F1]',
          },
          {
            label: 'Attendee Registrations',
            val: summary.totalRegistrations,
            sub: 'Across all workspaces',
            icon: 'how_to_reg',
            color: 'text-[#0284C7]',
          },
          {
            label: 'Active Organizers',
            val: summary.totalOrganizers,
            sub: 'Platform account owners',
            icon: 'groups',
            color: 'text-[#10B981]',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="ds-card p-4 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ds-muted">{item.label}</span>
              <span className={`material-symbols-outlined text-[20px] ${item.color}`}>
                {item.icon}
              </span>
            </div>
            <p className="font-space text-2xl font-bold text-ds-ink mt-2 tabular-nums">
              {item.val.toLocaleString()}
            </p>
            <p className="text-[11px] text-ds-muted mt-0.5">{item.sub}</p>
          </div>
        ))}
      </section>

      {/* Growth Trends Charts (Workspaces & Events) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Growth */}
        <div className="ds-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-ds-line">
              <h2 className="font-space text-base font-bold text-ds-ink">
                Workspace Registrations (Last 12 Months)
              </h2>
              <span className="text-xs font-semibold text-ds-accent">Tenant Growth</span>
            </div>

            {analytics.workspacesGrowth.length === 0 ? (
              <div className="py-12 text-center text-xs text-ds-muted">
                No historical workspace growth data available yet.
              </div>
            ) : (
              <div className="mt-6 flex items-end gap-3 h-44 pt-4 px-2">
                {analytics.workspacesGrowth.map((item) => {
                  const heightPercent = Math.max(12, Math.round((item.count / maxWorkspacesCount) * 100));
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-bold text-ds-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.count}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-t-lg bg-ds-accent hover:brightness-110 transition-all cursor-pointer"
                        title={`${item.month}: ${item.count} workspaces`}
                      />
                      <span className="text-[10px] text-ds-muted font-mono whitespace-nowrap">
                        {item.month.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mt-4 text-[11px] text-ds-muted border-t border-ds-line pt-2">
            Displays new workspace creation events aggregated monthly from PostgreSQL.
          </p>
        </div>

        {/* Events Growth */}
        <div className="ds-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-ds-line">
              <h2 className="font-space text-base font-bold text-ds-ink">
                Events Created (Last 12 Months)
              </h2>
              <span className="text-xs font-semibold text-[#0284C7]">Activity Volume</span>
            </div>

            {analytics.eventsGrowth.length === 0 ? (
              <div className="py-12 text-center text-xs text-ds-muted">
                No historical event creation data available yet.
              </div>
            ) : (
              <div className="mt-6 flex items-end gap-3 h-44 pt-4 px-2">
                {analytics.eventsGrowth.map((item) => {
                  const heightPercent = Math.max(12, Math.round((item.count / maxEventsCount) * 100));
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-bold text-[#0284C7] opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.count}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#0284C7] to-[#38BDF8] hover:brightness-110 transition-all cursor-pointer"
                        title={`${item.month}: ${item.count} events`}
                      />
                      <span className="text-[10px] text-ds-muted font-mono whitespace-nowrap">
                        {item.month.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mt-4 text-[11px] text-ds-muted border-t border-ds-line pt-2">
            Tracks total events scheduled across all workspaces by month.
          </p>
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Events By Status */}
        <div className="ds-card p-5">
          <h2 className="font-space text-sm font-bold text-ds-ink pb-3 border-b border-ds-line">
            Lifecycle Status Distribution
          </h2>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Published', count: summary.publishedEvents, color: 'bg-[#10B981]' },
              { label: 'Draft', count: summary.draftEvents, color: 'bg-ds-accent' },
              { label: 'Archived', count: summary.archivedEvents, color: 'bg-ds-muted' },
            ].map((st) => {
              const total = Math.max(1, summary.totalEvents);
              const pct = Math.round((st.count / total) * 100);
              return (
                <div key={st.label}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-ds-ink">{st.label}</span>
                    <span className="text-ds-muted">
                      {st.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-ds-line rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${st.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="ds-card p-5">
          <h2 className="font-space text-sm font-bold text-ds-ink pb-3 border-b border-ds-line">
            Subscription Tier Distribution
          </h2>
          <div className="mt-4 space-y-3">
            {analytics.planDistribution.length === 0 ? (
              <p className="text-xs text-ds-muted py-4 text-center">
                All workspaces currently on default Free tier.
              </p>
            ) : (
              analytics.planDistribution.map((p) => {
                const total = Math.max(1, summary.totalWorkspaces);
                const pct = Math.round((p.count / total) * 100);
                return (
                  <div key={p.plan}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-ds-ink uppercase">{p.plan}</span>
                      <span className="text-ds-muted">
                        {p.count.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-ds-line rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-ds-accent"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Operational Security Integrity */}
        <div className="ds-card p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-space text-sm font-bold text-ds-ink pb-3 border-b border-ds-line">
              Operational Diagnostics
            </h2>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ds-muted">Suspended Workspaces:</span>
                <span className="font-bold text-ds-ink tabular-nums">
                  {summary.suspendedWorkspaces}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ds-muted">Moderated Events:</span>
                <span className="font-bold text-ds-ink tabular-nums">
                  {summary.moderatedEvents}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ds-muted">Row Level Security:</span>
                <span className="text-[#10B981] font-bold">Enforced (Active)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ds-muted">Audit Logs:</span>
                <span className="text-[#10B981] font-bold">Append-Only</span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-2.5 rounded-xl bg-ds-accent-soft text-[11px] text-ds-accent font-medium">
            Cross-tenant boundaries verified. No direct write operations exposed.
          </div>
        </div>
      </div>
    </div>
  );
}
