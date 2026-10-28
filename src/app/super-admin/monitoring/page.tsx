import React from 'react';
import Link from 'next/link';
import { EmptyPanel, PageHeader, Panel, StatusPill, type PillTone } from '@/components/ui';
import { TrafficMap } from '@/components/super-admin/monitoring/TrafficMap';
import { CallRateChart } from '@/components/super-admin/monitoring/CallRateChart';
import { MonitoringToolbar } from '@/components/super-admin/monitoring/MonitoringToolbar';
import { MonitoringSettingsForm } from '@/components/super-admin/settings/MonitoringSettingsForm';
import { fmtDate } from '@/components/super-admin/fmt';
import {
  TARGET_KIND_LABEL,
  WINDOWS,
  formatBytes,
  formatCount,
  formatMs,
  formatPct,
} from '@/components/super-admin/monitoring/format';
import { getDbCallMetrics, getDbHealth, getPlatformSettings } from '@/services/platformMonitoring.server';
import { DEFAULT_MONITORING_SETTINGS, type MonitoringResult } from '@/lib/monitoring/types';

type SearchParams = Record<string, string | string[] | undefined>;

const KIND_TONE: Record<string, PillTone> = {
  table: 'neutral',
  rpc: 'brand',
  auth: 'info',
  storage: 'warning',
  functions: 'success',
  other: 'neutral',
};

function Vital({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'danger' | 'warning' }) {
  return (
    <div className="min-w-0 bg-ds-surface px-4 py-3.5 sm:px-5">
      <dt className="text-[12px] text-ds-muted">{label}</dt>
      <dd
        className={`mt-1 text-[22px] font-semibold leading-none tracking-tight tabular-nums ${
          tone === 'danger' ? 'text-ds-danger' : tone === 'warning' ? 'text-ds-warning' : 'text-ds-ink'
        }`}
      >
        {value}
      </dd>
      {note && <dd className="mt-1.5 truncate text-[12px] text-ds-muted">{note}</dd>}
    </div>
  );
}

function Unavailable({ result }: { result: Extract<MonitoringResult<unknown>, { ok: false }> }) {
  return (
    <EmptyPanel
      icon={result.reason === 'not_installed' ? 'database' : 'error'}
      title={result.reason === 'not_installed' ? 'Monitoring isn’t set up yet' : 'Couldn’t load this data'}
      description={result.message}
    />
  );
}

const TABS = [
  { key: 'traffic', label: 'App traffic' },
  { key: 'database', label: 'Database health' },
  { key: 'settings', label: 'Settings' },
] as const;

function SetupNotice() {
  return (
    <div className="rounded-xl border border-ds-warning/30 bg-ds-warning-soft px-4 py-3.5 text-[13px] leading-relaxed text-ds-warning">
      <p className="font-medium">Monitoring isn’t switched on in your database yet.</p>
      <p className="mt-1">
        Open Supabase, go to SQL Editor, paste the contents of{' '}
        <code className="font-mono text-[12px]">supabase/migrations/20261028000000_super_admin_live.sql</code> and click Run.
        It’s safe to run more than once. Calls start showing here within a minute of the next page load.
      </p>
    </div>
  );
}

function MonitoringSettingsTab({ settingsResult }: { settingsResult: Awaited<ReturnType<typeof getPlatformSettings>> }) {
  return (
    <section className="ds-card max-w-3xl p-4 sm:p-5" aria-label="Monitoring settings">
      {settingsResult.ok ? (
        <>
          <MonitoringSettingsForm initial={settingsResult.data.monitoring} canManage={settingsResult.data.canManage} />
          {settingsResult.data.monitoringUpdatedAt && (
            <p className="mt-3 text-[12px] text-ds-muted">
              Last changed {fmtDate(settingsResult.data.monitoringUpdatedAt)}
              {settingsResult.data.monitoringUpdatedBy ? ` by ${settingsResult.data.monitoringUpdatedBy}` : ''}.
            </p>
          )}
        </>
      ) : (
        <EmptyPanel
          icon={settingsResult.reason === 'not_installed' ? 'database' : 'error'}
          title={settingsResult.reason === 'not_installed' ? 'Settings appear once the setup SQL has run' : 'Couldn’t load settings'}
          description={
            settingsResult.reason === 'not_installed'
              ? `Until then every call is recorded, slow means ${DEFAULT_MONITORING_SETTINGS.slowCallMs} ms or more, and history is kept ${DEFAULT_MONITORING_SETTINGS.retentionDays} days.`
              : settingsResult.message
          }
        />
      )}
    </section>
  );
}

export default async function SuperAdminMonitoringPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const win = WINDOWS.find((w) => w.key === params.window) ?? WINDOWS[1];
  const tab = TABS.find((t) => t.key === params.tab)?.key ?? 'traffic';

  const [callsResult, healthResult, settingsResult] = await Promise.all([
    getDbCallMetrics(win.minutes),
    getDbHealth(),
    getPlatformSettings(),
  ]);

  const settings = settingsResult.ok ? settingsResult.data.monitoring : DEFAULT_MONITORING_SETTINGS;
  const calls = callsResult.ok ? callsResult.data : null;
  const health = healthResult.ok ? healthResult.data : null;

  const notInstalled = [callsResult, healthResult, settingsResult].some((r) => !r.ok && r.reason === 'not_installed');
  const totals = calls?.totals;
  const errorPct = totals?.calls ? (totals.errors / totals.calls) * 100 : 0;
  const perMinute = totals ? totals.calls / win.minutes : 0;
  const connectionsUsed = health?.connections.reduce((s, c) => s + c.total, 0) ?? 0;
  const connectionPct = health ? (connectionsUsed / health.maxConnections) * 100 : 0;

  const lastSeen = calls?.lastRecordedAt
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(calls.lastRecordedAt))
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database monitoring"
        description="How often each part of Aram calls the database, which tables and functions it hits, and how Postgres is holding up."
      />

      <nav aria-label="Monitoring sections" className="-mb-2 flex gap-6 overflow-x-auto border-b border-ds-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/super-admin/monitoring${t.key === 'traffic' ? '' : `?tab=${t.key}`}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 text-[14px] focus-visible:outline-2 focus-visible:outline-ds-accent ${
              tab === t.key ? 'border-ds-accent font-medium text-ds-ink' : 'border-transparent text-ds-muted hover:text-ds-ink'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {notInstalled && <SetupNotice />}

      {tab === 'traffic' && (
        <>
        <MonitoringToolbar active={win.key} renderedAt={new Date().toISOString()} />

        {!settings.captureEnabled && (
          <div className="flex items-start gap-3 rounded-xl border border-ds-warning/30 bg-ds-warning-soft px-4 py-3 text-[13px] text-ds-warning">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">pause_circle</span>
            <p>
              Call recording is paused, so new traffic isn’t being counted. Postgres stats below are still live.{' '}
              <Link href="/super-admin/monitoring?tab=settings" className="font-medium underline">Resume recording</Link>
            </p>
          </div>
        )}

        {/* Vitals */}
        <section aria-label="Key figures" className="ds-card overflow-hidden">
          <dl className="grid grid-cols-2 gap-px bg-ds-line sm:grid-cols-3 xl:grid-cols-6">
            <Vital label={`Calls, last ${win.label}`} value={totals ? formatCount(totals.calls) : '—'} note={totals ? `${perMinute >= 10 ? Math.round(perMinute) : perMinute.toFixed(1)} per minute` : undefined} />
            <Vital
              label="Failed"
              value={totals ? formatPct(totals.errors, totals.calls) : '—'}
              note={totals ? `${formatCount(totals.errors)} calls` : undefined}
              tone={errorPct >= settings.errorRateAlertPct ? 'danger' : undefined}
            />
            <Vital
              label="Average time"
              value={totals?.calls ? formatMs(totals.total_ms / totals.calls) : '—'}
              note={totals ? `Slowest ${formatMs(totals.max_ms)}` : undefined}
            />
            <Vital
              label={`Slower than ${formatMs(settings.slowCallMs)}`}
              value={totals ? formatCount(totals.slow) : '—'}
              note={totals ? formatPct(totals.slow, totals.calls) : undefined}
              tone={totals && totals.calls && totals.slow / totals.calls >= 0.1 ? 'warning' : undefined}
            />
            <Vital
              label="Connections"
              value={health ? `${connectionsUsed} / ${health.maxConnections}` : '—'}
              note={health ? `${Math.round(connectionPct)}% of the limit` : undefined}
              tone={connectionPct >= 80 ? 'danger' : connectionPct >= 60 ? 'warning' : undefined}
            />
            <Vital
              label="Database size"
              value={health ? formatBytes(health.databaseSizeBytes) : '—'}
              note={health?.database.cacheHitPct != null ? `${health.database.cacheHitPct}% cache hits` : undefined}
              tone={health?.database.cacheHitPct != null && health.database.cacheHitPct < 95 ? 'warning' : undefined}
            />
          </dl>
        </section>

        {/* Traffic map — the centrepiece */}
        <Panel
          title="Who’s calling the database"
          description={`Each application on the left, the tables, functions and services it calls on the right. Last ${win.label}.`}
        >
          {!callsResult.ok ? (
            <Unavailable result={callsResult} />
          ) : calls && calls.totals.calls > 0 ? (
            <TrafficMap flows={calls.flows} alertPct={settings.errorRateAlertPct} />
          ) : (
            <EmptyPanel
              icon="hub"
              title={`No calls in the last ${win.label}`}
              description={
                lastSeen
                  ? `The most recent call was recorded ${lastSeen} UTC. Pick a longer window to see it.`
                  : 'Calls show up here within a minute of the next page load or API request.'
              }
            />
          )}
        </Panel>


        <Panel
          title="Call rate"
          description="Database calls over time. Failed calls are marked in red. Hover a bar for details."
        >
          {calls && calls.totals.calls > 0 ? (
            <CallRateChart points={calls.timeline} stepMinutes={calls.stepMinutes} />
          ) : (
            <p className="py-10 text-center text-sm text-ds-muted">No calls to chart for this window.</p>
          )}
        </Panel>

        {/* Busiest targets */}
        <Panel
          flush
          title="Busiest tables and functions"
          description={`Ranked by calls from the app servers in the last ${win.label}.`}
        >
          {calls && calls.targets.length > 0 ? (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th scope="col">Target</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="text-right">Calls</th>
                    <th scope="col" className="w-[18%]">Share</th>
                    <th scope="col" className="text-right">Failed</th>
                    <th scope="col" className="text-right">Avg time</th>
                    <th scope="col" className="text-right">Slowest</th>
                    <th scope="col" className="text-right">Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.targets.map((t) => {
                    const failing = t.calls && (t.errors / t.calls) * 100 >= settings.errorRateAlertPct;
                    const avg = t.calls ? t.totalMs / t.calls : 0;
                    return (
                      <tr key={`${t.targetKind}:${t.target}`}>
                        <td className="font-medium text-ds-ink">{t.target}</td>
                        <td>
                          <StatusPill tone={KIND_TONE[t.targetKind] ?? 'neutral'} dot={false}>
                            {TARGET_KIND_LABEL[t.targetKind] ?? t.targetKind}
                          </StatusPill>
                        </td>
                        <td className="text-right tabular-nums">{t.calls.toLocaleString('en')}</td>
                        <td>
                          <div className="h-1.5 overflow-hidden rounded-full bg-ds-line" title={formatPct(t.calls, calls.totals.calls)}>
                            <div className="h-full rounded-full bg-ds-accent" style={{ width: `${(t.calls / calls.totals.calls) * 100}%` }} />
                          </div>
                        </td>
                        <td className={`text-right tabular-nums ${failing ? 'font-medium text-ds-danger' : ''}`}>
                          {formatPct(t.errors, t.calls)}
                        </td>
                        <td className={`text-right tabular-nums ${avg >= settings.slowCallMs ? 'text-ds-warning' : ''}`}>{formatMs(avg)}</td>
                        <td className="text-right tabular-nums text-ds-muted">{formatMs(t.maxMs)}</td>
                        <td className="text-right tabular-nums text-ds-muted">{t.sources}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-ds-muted">Nothing recorded for this window.</p>
          )}
        </Panel>

        </>
      )}

      {tab === 'database' && (
        <>
        {/* Postgres-side stats */}
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <Panel
            title="Connections by application"
            description="Open Postgres connections right now, grouped by the service holding them."
          >
            {!healthResult.ok ? (
              <Unavailable result={healthResult} />
            ) : health && health.connections.length > 0 ? (
              <ul className="space-y-3.5">
                {health.connections.map((c) => (
                  <li key={c.application}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="min-w-0 truncate font-medium text-ds-ink" title={c.application}>{c.application}</span>
                      <span className="shrink-0 tabular-nums text-ds-muted">
                        {c.active} active, {c.idle} idle
                        {c.idleInTransaction > 0 && <span className="text-ds-warning">, {c.idleInTransaction} stuck in transaction</span>}
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ds-line" aria-hidden="true">
                      <div className="bg-ds-accent" style={{ width: `${(c.active / health.maxConnections) * 100}%` }} />
                      <div className="bg-ds-accent/35" style={{ width: `${(c.idle / health.maxConnections) * 100}%` }} />
                      <div className="bg-ds-warning" style={{ width: `${(c.idleInTransaction / health.maxConnections) * 100}%` }} />
                    </div>
                    {c.longestActiveSec >= 5 && (
                      <p className="mt-1 text-[12px] text-ds-warning">Longest running query: {c.longestActiveSec}s</p>
                    )}
                  </li>
                ))}
                <li className="pt-1 text-[12px] text-ds-muted">
                  Bars are measured against the {health.maxConnections}-connection limit.
                </li>
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-ds-muted">No other connections are open.</p>
            )}
          </Panel>
          <Panel
            flush
            title="Table activity"
            description={
              health?.statsResetAt
                ? `Cumulative since Postgres stats were last reset (${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(health.statsResetAt))}). Includes browser and direct traffic.`
                : 'Cumulative Postgres counters. Includes browser and direct traffic.'
            }
          >
            {!healthResult.ok ? (
              <Unavailable result={healthResult} />
            ) : health && health.tables.length > 0 ? (
              <div className="ds-table-wrap max-h-[480px] overflow-y-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th scope="col">Table</th>
                      <th scope="col" className="text-right">Rows</th>
                      <th scope="col" className="text-right">Size</th>
                      <th scope="col" className="text-right">Reads by index</th>
                      <th scope="col" className="text-right">Writes</th>
                      <th scope="col" className="text-right">Dead rows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.tables.map((t) => {
                      const scans = t.seqScans + t.indexScans;
                      const idxShare = scans ? t.indexScans / scans : 1;
                      // Full scans only matter once a table is big enough to hurt.
                      const scanWarning = t.liveRows > 1000 && idxShare < 0.9;
                      const bloat = t.liveRows > 0 && t.deadRows / t.liveRows > 0.2 && t.deadRows > 500;
                      return (
                        <tr key={t.name}>
                          <td className="font-medium text-ds-ink">{t.name}</td>
                          <td className="text-right tabular-nums">{formatCount(t.liveRows)}</td>
                          <td className="text-right tabular-nums text-ds-muted">{formatBytes(t.sizeBytes)}</td>
                          <td
                            className={`text-right tabular-nums ${scanWarning ? 'text-ds-warning' : ''}`}
                            title={`${t.indexScans.toLocaleString('en')} index scans, ${t.seqScans.toLocaleString('en')} full scans`}
                          >
                            {scans ? formatPct(t.indexScans, scans) : '—'}
                          </td>
                          <td className="text-right tabular-nums" title={`${t.inserts.toLocaleString('en')} inserts, ${t.updates.toLocaleString('en')} updates, ${t.deletes.toLocaleString('en')} deletes`}>
                            {formatCount(t.inserts + t.updates + t.deletes)}
                          </td>
                          <td className={`text-right tabular-nums ${bloat ? 'text-ds-warning' : 'text-ds-muted'}`}>{formatCount(t.deadRows)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-ds-muted">No tables found in the public schema.</p>
            )}
          </Panel>

          <Panel
            flush
            title="Most frequent queries"
            description="Normalized SQL from pg_stat_statements, values replaced with placeholders."
          >
            {!healthResult.ok ? (
              <Unavailable result={healthResult} />
            ) : health?.statements && health.statements.length > 0 ? (
              <ul className="max-h-[480px] divide-y divide-ds-line overflow-y-auto">
                {health.statements.map((s, i) => (
                  <li key={i} className="px-4 py-3 sm:px-5">
                    <code className="block break-all font-mono text-[12px] leading-relaxed text-ds-body line-clamp-3" title={s.query}>
                      {s.query}
                    </code>
                    <p className="mt-1.5 text-[12px] tabular-nums text-ds-muted">
                      {s.calls.toLocaleString('en')} calls, {formatMs(s.meanMs)} avg, {formatMs(s.totalMs)} total, {formatCount(s.rows)} rows
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-ds-muted">
                Query stats need the pg_stat_statements extension. Turn it on under Database → Extensions in Supabase.
              </p>
            )}
          </Panel>
        </div>

        </>
      )}

      {tab === 'settings' && <MonitoringSettingsTab settingsResult={settingsResult} />}

      <p className="text-[12px] leading-relaxed text-ds-muted">
        Call counts come from the app’s servers (pages, API routes, server actions, background jobs and the session check on
        every request). Calls the browser sends straight to Supabase, like sign-in, appear only in the Postgres stats.
        {settings.sampleRate < 100 && ` Recording ${settings.sampleRate}% of calls and scaling counts up to match.`}
      </p>
    </div>
  );
}
