export function formatCount(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return Math.round(n).toLocaleString('en');
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function formatMs(ms: number) {
  if (!Number.isFinite(ms)) return '—';
  if (ms >= 10_000) return `${(ms / 1000).toFixed(0)} s`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatPct(part: number, whole: number) {
  if (!whole) return '0%';
  const pct = (part / whole) * 100;
  if (pct > 0 && pct < 0.1) return '<0.1%';
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`;
}

export const TARGET_KIND_LABEL: Record<string, string> = {
  table: 'Table',
  rpc: 'Function',
  auth: 'Auth',
  storage: 'Storage',
  functions: 'Edge fn',
  other: 'Other',
};

export const WINDOWS = [
  { key: '15m', label: '15 min', minutes: 15 },
  { key: '1h', label: '1 hour', minutes: 60 },
  { key: '6h', label: '6 hours', minutes: 360 },
  { key: '24h', label: '24 hours', minutes: 1440 },
  { key: '7d', label: '7 days', minutes: 10080 },
] as const;
