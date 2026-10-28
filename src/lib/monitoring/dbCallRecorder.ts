/**
 * Backend → database call recorder.
 *
 * Wraps the `fetch` used by server-side Supabase clients, classifies each call
 * (table, RPC, auth, storage, functions), and aggregates counts per minute in
 * memory. Aggregates are flushed after the response with `after()` to the
 * service-role-only `ingest_platform_db_call_metrics` RPC.
 *
 * Only identifiers are recorded (table / RPC names, auth endpoint, storage
 * bucket); never query strings, bodies, headers or user identifiers.
 */
import { after } from 'next/server';
import { classifySurface, type MetricSource } from './surfaces';

export type TargetKind = 'table' | 'rpc' | 'auth' | 'storage' | 'functions' | 'other';

interface Bucket {
  bucket: string;
  source: MetricSource;
  targetKind: TargetKind;
  target: string;
  method: string;
  calls: number;
  errors: number;
  slowCalls: number;
  totalMs: number;
  maxMs: number;
}

interface MonitoringConfig {
  captureEnabled: boolean;
  sampleRate: number;
  slowCallMs: number;
}

const INGEST_RPC = 'ingest_platform_db_call_metrics';
const CONFIG_TTL_MS = 60_000;
const MAX_BUFFERED_KEYS = 2_000;
const FLUSH_BATCH = 500;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE']);

const buffer = new Map<string, Bucket>();
let flushScheduled = false;
let config: MonitoringConfig = { captureEnabled: true, sampleRate: 100, slowCallMs: 500 };
let configLoadedAt = 0;

function serviceCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

export function classifyTarget(rawUrl: string): { kind: TargetKind; target: string } | null {
  let path: string;
  try {
    path = new URL(rawUrl).pathname;
  } catch {
    return null;
  }

  const parts = path.split('/').filter(Boolean);
  const [service, version, first, second] = parts;
  if (version !== 'v1') return { kind: 'other', target: service || 'unknown' };

  switch (service) {
    case 'rest':
      if (!first) return { kind: 'other', target: 'rest' };
      if (first === 'rpc') {
        if (second === INGEST_RPC) return null;
        return { kind: 'rpc', target: second || 'unknown' };
      }
      return { kind: 'table', target: first };
    case 'auth':
      // e.g. /auth/v1/user, /auth/v1/token, /auth/v1/admin/users
      return { kind: 'auth', target: first === 'admin' ? `admin/${second || ''}` : first || 'auth' };
    case 'storage':
      // /storage/v1/object/<bucket>/..., /storage/v1/object/public/<bucket>/...
      if (first === 'object') {
        const bucket = second === 'public' || second === 'sign' || second === 'authenticated'
          ? parts[4]
          : second;
        return { kind: 'storage', target: bucket || 'object' };
      }
      return { kind: 'storage', target: first || 'storage' };
    case 'functions':
      return { kind: 'functions', target: first || 'functions' };
    case 'realtime':
      return null;
    default:
      return { kind: 'other', target: service || 'unknown' };
  }
}

function minuteBucket(now: number) {
  return new Date(Math.floor(now / 60_000) * 60_000).toISOString();
}

function record(entry: {
  source: MetricSource;
  kind: TargetKind;
  target: string;
  method: string;
  ok: boolean;
  durationMs: number;
}) {
  const method = METHODS.has(entry.method) ? entry.method : 'OTHER';
  const bucket = minuteBucket(Date.now());
  const key = `${bucket}|${entry.source}|${entry.kind}|${entry.target}|${method}`;

  let row = buffer.get(key);
  if (!row) {
    if (buffer.size >= MAX_BUFFERED_KEYS) return;
    row = {
      bucket,
      source: entry.source,
      targetKind: entry.kind,
      target: entry.target.slice(0, 96),
      method,
      calls: 0,
      errors: 0,
      slowCalls: 0,
      totalMs: 0,
      maxMs: 0,
    };
    buffer.set(key, row);
  }

  // Sampled calls are scaled back up so totals stay comparable across rates.
  const weight = Math.round(100 / config.sampleRate);
  const ms = Math.max(0, Math.round(entry.durationMs));
  row.calls += weight;
  if (!entry.ok) row.errors += weight;
  if (ms >= config.slowCallMs) row.slowCalls += weight;
  row.totalMs += ms * weight;
  row.maxMs = Math.max(row.maxMs, ms);

  scheduleFlush();
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  const run = async () => {
    flushScheduled = false;
    await flush();
  };
  try {
    after(run);
  } catch {
    // Outside a request scope (scripts, build): flush on the next tick.
    setTimeout(() => void run(), 0);
  }
}

async function refreshConfig(creds: { url: string; key: string }) {
  if (Date.now() - configLoadedAt < CONFIG_TTL_MS) return;
  configLoadedAt = Date.now();
  try {
    const res = await fetch(`${creds.url}/rest/v1/platform_settings?key=eq.monitoring&select=value`, {
      headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}` },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const rows = (await res.json()) as Array<{ value?: Partial<MonitoringConfig> }>;
    const value = rows[0]?.value;
    if (!value) return;
    config = {
      captureEnabled: value.captureEnabled !== false,
      sampleRate: Math.min(100, Math.max(1, Number(value.sampleRate) || 100)),
      slowCallMs: Math.max(50, Number(value.slowCallMs) || 500),
    };
  } catch {
    // Keep the last known configuration.
  }
}

export async function flush() {
  const creds = serviceCredentials();
  if (!creds) {
    buffer.clear();
    return;
  }

  await refreshConfig(creds);
  if (buffer.size === 0) return;

  const rows = Array.from(buffer.values());
  buffer.clear();
  if (!config.captureEnabled) return;

  for (let i = 0; i < rows.length; i += FLUSH_BATCH) {
    try {
      await fetch(`${creds.url}/rest/v1/rpc/${INGEST_RPC}`, {
        method: 'POST',
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_rows: rows.slice(i, i + FLUSH_BATCH) }),
        cache: 'no-store',
      });
    } catch {
      // Metrics are best-effort; a failed flush never affects the request.
    }
  }
}

/**
 * Returns a fetch implementation for Supabase clients that records each call.
 * `resolveSource` is evaluated per call so it can read request headers lazily.
 */
export function createRecordingFetch(
  resolveSource: () => MetricSource | Promise<MetricSource>,
): typeof fetch {
  return async (input, init) => {
    if (!config.captureEnabled || Math.random() * 100 >= config.sampleRate) {
      if (!config.captureEnabled) scheduleConfigRefresh();
      return fetch(input, init);
    }

    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const target = classifyTarget(url);
    if (!target) return fetch(input, init);

    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const started = performance.now();
    let ok = false;
    try {
      const res = await fetch(input, init);
      ok = res.status < 400;
      return res;
    } finally {
      let source: MetricSource = 'other';
      try {
        source = await resolveSource();
      } catch {
        // Fall back to "other" when request context is unavailable.
      }
      record({ source, kind: target.kind, target: target.target, method, ok, durationMs: performance.now() - started });
    }
  };
}

// While capture is disabled nothing is buffered, so no flush runs to pick up a
// re-enable. Refresh the config opportunistically instead.
function scheduleConfigRefresh() {
  if (Date.now() - configLoadedAt < CONFIG_TTL_MS) return;
  const creds = serviceCredentials();
  if (!creds) return;
  try {
    after(() => refreshConfig(creds));
  } catch {
    void refreshConfig(creds);
  }
}

/** Source resolver for request-scoped server code: reads the proxy-set pathname. */
export async function sourceFromRequestHeaders(): Promise<MetricSource> {
  const { headers } = await import('next/headers');
  const h = await headers();
  return classifySurface(h.get('x-pathname') || '');
}
