'use client';

import React, { useState } from 'react';
import type { CallTimelinePoint } from '@/lib/monitoring/types';
import { formatCount } from './format';
import { useHydrated } from './useHydrated';

const H = 160;

function timeLabel(iso: string, withDate: boolean, hydrated: boolean) {
  if (!hydrated) return ' ';
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, withDate
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { hour: 'numeric', minute: '2-digit' }).format(d);
}

export function CallRateChart({ points, stepMinutes }: { points: CallTimelinePoint[]; stepMinutes: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const hydrated = useHydrated();
  if (points.length === 0) return null;

  const max = Math.max(1, ...points.map((p) => p.calls));
  const withDate = points.length * stepMinutes > 1440;
  const n = points.length;
  const slotW = 1000 / n;
  const barW = Math.max(1, slotW * 0.72);
  const active = hover ?? n - 1;
  const current = points[active];
  const unit = stepMinutes === 1 ? 'min' : stepMinutes === 60 ? 'hour' : `${stepMinutes} min`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]" aria-live="polite">
        <span className="text-ds-muted">{timeLabel(current.t, withDate, hydrated)}{hover === null ? ' (latest)' : ''}</span>
        <span className="tabular-nums text-ds-ink">
          <strong className="font-semibold">{current.calls.toLocaleString('en')}</strong> calls per {unit}
        </span>
        {current.errors > 0 && (
          <span className="tabular-nums text-ds-danger">{current.errors.toLocaleString('en')} failed</span>
        )}
        {current.slow > 0 && <span className="tabular-nums text-ds-warning">{current.slow.toLocaleString('en')} slow</span>}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 1000 ${H}`}
          preserveAspectRatio="none"
          className="block h-40 w-full"
          role="img"
          aria-label={`Database calls per ${unit}, peak ${formatCount(max)}`}
          onMouseLeave={() => setHover(null)}
        >
          {[0.5, 1].map((f) => (
            <line key={f} x1={0} x2={1000} y1={H - H * f} y2={H - H * f} stroke="var(--color-ds-line)" strokeDasharray={f === 1 ? undefined : '4 4'} vectorEffect="non-scaling-stroke" />
          ))}
          {points.map((p, i) => {
            const h = (p.calls / max) * (H - 4);
            const eh = (p.errors / max) * (H - 4);
            const x = i * slotW + (slotW - barW) / 2;
            const on = i === active;
            return (
              <g key={p.t} onMouseEnter={() => setHover(i)}>
                <rect x={i * slotW} y={0} width={slotW} height={H} fill="transparent" />
                {p.calls > 0 && (
                  <rect x={x} y={H - h} width={barW} height={h} fill={on ? 'var(--color-ds-accent-strong)' : 'var(--color-ds-accent)'} opacity={on ? 1 : 0.55} />
                )}
                {p.errors > 0 && <rect x={x} y={H - eh} width={barW} height={Math.max(1.5, eh)} fill="var(--color-ds-danger)" />}
              </g>
            );
          })}
        </svg>
        <span className="pointer-events-none absolute right-0 top-0 -translate-y-full pb-0.5 text-[11px] tabular-nums text-ds-muted">
          {formatCount(max)}
        </span>
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-ds-muted">
        <span>{timeLabel(points[0].t, withDate, hydrated)}</span>
        <span>{timeLabel(points[Math.floor(n / 2)].t, withDate, hydrated)}</span>
        <span>{timeLabel(points[n - 1].t, withDate, hydrated)}</span>
      </div>
    </div>
  );
}
