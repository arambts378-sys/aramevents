import React from 'react';
import { EmptyPanel, PageHeader, Panel } from '@/components/ui';
import { getAnalytics } from '@/services/superAdminLive.server';

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Paired monthly columns: a primary series with an optional overlaid secondary one. */
function MonthlyBars({
  months,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
}: {
  months: string[];
  primary: number[];
  secondary?: number[];
  primaryLabel: string;
  secondaryLabel?: string;
}) {
  const max = Math.max(1, ...primary, ...(secondary ?? []));
  return (
    <figure>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label={`${primaryLabel} per month, last 12 months`}>
        {months.map((m, i) => (
          <div key={m} className="group relative flex h-full flex-1 flex-col justify-end" title={`${monthLabel(m)}: ${primary[i]} ${primaryLabel.toLowerCase()}${secondary ? `, ${secondary[i]} ${secondaryLabel?.toLowerCase()}` : ''}`}>
            <div className="relative w-full rounded-t-[3px] bg-ds-accent/25" style={{ height: `${(primary[i] / max) * 100}%`, minHeight: primary[i] ? 3 : 0 }}>
              {secondary && (
                <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-ds-accent" style={{ height: primary[i] ? `${Math.min(100, (secondary[i] / Math.max(1, primary[i])) * 100)}%` : 0 }} />
              )}
            </div>
            <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] tabular-nums text-ds-ink opacity-0 group-hover:opacity-100">{primary[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-2">
        {months.map((m) => (
          <span key={m} className="flex-1 text-center text-[11px] text-ds-muted">{monthLabel(m)}</span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-[12px] text-ds-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ds-accent/25" aria-hidden="true" />{primaryLabel}</span>
        {secondaryLabel && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ds-accent" aria-hidden="true" />{secondaryLabel}</span>}
      </figcaption>
    </figure>
  );
}

function Breakdown({ rows }: { rows: Array<{ label: string; count: number }> }) {
  const total = Math.max(1, rows.reduce((s, r) => s + r.count, 0));
  if (rows.length === 0) return <p className="text-[13px] text-ds-muted">No events yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-[13px]">
            <span className="capitalize text-ds-ink">{r.label.replace(/_/g, ' ')}</span>
            <span className="tabular-nums text-ds-muted">{r.count} ({Math.round((r.count / total) * 100)}%)</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ds-line">
            <div className="h-full rounded-full bg-ds-accent" style={{ width: `${(r.count / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage() {
  const result = await getAnalytics();
  if (!result.ok) {
    return <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load analytics" description={result.message} /></div>;
  }
  const { months, eventsByType, eventsByStatus, topEvents, totals } = result.data;
  const keys = months.map((m) => m.month);
  const sum = (k: 'organizers' | 'events' | 'registrations' | 'checkIns') => months.reduce((s, m) => s + m[k], 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Growth and attendance across the whole platform over the last 12 months." />

      <section className="ds-card overflow-hidden" aria-label="12-month totals">
        <dl className="grid grid-cols-2 gap-px bg-ds-line lg:grid-cols-4">
          {[
            { label: 'New organizers', value: sum('organizers') },
            { label: 'Events created', value: sum('events') },
            { label: 'Registrations', value: sum('registrations') },
            {
              label: 'Attendance',
              value: totals.attendanceRate === null ? '—' : `${Math.round(totals.attendanceRate * 100)}%`,
              note: `${totals.checkIns.toLocaleString('en')} of ${totals.registrations.toLocaleString('en')} registrations checked in`,
            },
          ].map((f) => (
            <div key={f.label} className="bg-ds-surface px-5 py-4">
              <dt className="text-[13px] text-ds-muted">{f.label}</dt>
              <dd className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ds-ink">
                {typeof f.value === 'number' ? f.value.toLocaleString('en') : f.value}
              </dd>
              {'note' in f && f.note && <dd className="mt-2 text-[12px] text-ds-muted">{f.note}</dd>}
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Registrations and check-ins" description="Dark fill shows how many registrations were checked in that month.">
          <MonthlyBars months={keys} primary={months.map((m) => m.registrations)} secondary={months.map((m) => m.checkIns)} primaryLabel="Registrations" secondaryLabel="Checked in" />
        </Panel>
        <Panel title="Organizer sign-ups and new events">
          <MonthlyBars months={keys} primary={months.map((m) => m.organizers)} secondary={months.map((m) => m.events)} primaryLabel="Organizer sign-ups" secondaryLabel="Events created" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Events by type"><Breakdown rows={eventsByType.map((r) => ({ label: r.type, count: r.count }))} /></Panel>
        <Panel title="Events by status"><Breakdown rows={eventsByStatus.map((r) => ({ label: r.status === 'published' ? 'live' : r.status, count: r.count }))} /></Panel>
        <Panel title="Biggest events" description="By registrations, all time." flush>
          {topEvents.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-ds-muted">No registrations yet.</p>
          ) : (
            <ol className="divide-y divide-ds-line">
              {topEvents.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[13px] sm:px-5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ds-ink">{e.name}</span>
                    <span className="block truncate text-[12px] text-ds-muted">{e.workspaceName}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {e.registrations.toLocaleString('en')}
                    <span className="block text-[12px] text-ds-muted">{e.checkIns.toLocaleString('en')} in</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
