import React from 'react';
import type { CallFlow } from '@/lib/monitoring/types';
import { SOURCE_LABELS, type MetricSource } from '@/lib/monitoring/surfaces';
import { TARGET_KIND_LABEL, formatCount, formatMs } from './format';

const MAX_TARGETS = 8;
const REST_KEY = '__rest';
const W = 1000;
const LEFT_BAR = 236;
const RIGHT_BAR = 756;
const BAR_W = 8;
const SLOT_MIN = 40;
const GAP = 12;

interface Node {
  key: string;
  label: string;
  meta: string;
  calls: number;
  errors: number;
  slot: number;
  y: number;
  h: number;
}

type Health = 'ok' | 'slow' | 'failing';

function health(calls: number, errors: number, slow: number, alertPct: number): Health {
  if (!calls) return 'ok';
  if ((errors / calls) * 100 >= alertPct) return 'failing';
  if (slow / calls >= 0.1) return 'slow';
  return 'ok';
}

const LINK_FILL: Record<Health, string> = {
  ok: 'var(--color-ds-accent)',
  slow: 'var(--color-ds-warning)',
  failing: 'var(--color-ds-danger)',
};

function sourceLabel(source: string) {
  return SOURCE_LABELS[source as MetricSource]?.label ?? source;
}

function targetKey(f: Pick<CallFlow, 'targetKind' | 'target'>) {
  return `${f.targetKind}:${f.target}`;
}

function layout(nodes: Omit<Node, 'slot' | 'y' | 'h'>[], scale: number): Node[] {
  let cursor = 0;
  return nodes.map((n) => {
    const h = Math.max(3, n.calls * scale);
    const slot = Math.max(h, SLOT_MIN);
    const node = { ...n, h, slot, y: cursor + (slot - h) / 2 };
    cursor += slot + GAP;
    return node;
  });
}

function band(x0: number, y0: number, x1: number, y1: number, thickness: number) {
  const xm = (x0 + x1) / 2;
  return [
    `M${x0},${y0}`,
    `C${xm},${y0} ${xm},${y1} ${x1},${y1}`,
    `L${x1},${y1 + thickness}`,
    `C${xm},${y1 + thickness} ${xm},${y0 + thickness} ${x0},${y0 + thickness}`,
    'Z',
  ].join(' ');
}

export function TrafficMap({ flows, alertPct }: { flows: CallFlow[]; alertPct: number }) {
  const total = flows.reduce((s, f) => s + f.calls, 0);
  if (!total) return null;

  // Right side: busiest targets, the long tail folded into one node.
  const byTarget = new Map<string, { kind: string; target: string; calls: number; errors: number; totalMs: number }>();
  for (const f of flows) {
    const k = targetKey(f);
    const t = byTarget.get(k) ?? { kind: f.targetKind, target: f.target, calls: 0, errors: 0, totalMs: 0 };
    t.calls += f.calls;
    t.errors += f.errors;
    t.totalMs += f.totalMs;
    byTarget.set(k, t);
  }
  const ranked = [...byTarget.entries()].sort((a, b) => b[1].calls - a[1].calls);
  const kept = new Set(ranked.slice(0, MAX_TARGETS).map(([k]) => k));
  const rest = ranked.slice(MAX_TARGETS);

  // Collapse flows onto the visible target nodes.
  const links = new Map<string, { source: string; target: string; calls: number; errors: number; slow: number; totalMs: number }>();
  for (const f of flows) {
    const tk = kept.has(targetKey(f)) ? targetKey(f) : REST_KEY;
    const lk = `${f.source}→${tk}`;
    const l = links.get(lk) ?? { source: f.source, target: tk, calls: 0, errors: 0, slow: 0, totalMs: 0 };
    l.calls += f.calls;
    l.errors += f.errors;
    l.slow += f.slow;
    l.totalMs += f.totalMs;
    links.set(lk, l);
  }

  const bySource = new Map<string, { calls: number; errors: number }>();
  for (const f of flows) {
    const s = bySource.get(f.source) ?? { calls: 0, errors: 0 };
    s.calls += f.calls;
    s.errors += f.errors;
    bySource.set(f.source, s);
  }

  const leftRaw = [...bySource.entries()]
    .sort((a, b) => b[1].calls - a[1].calls)
    .map(([key, s]) => ({
      key,
      label: sourceLabel(key),
      meta: `${formatCount(s.calls)} calls${s.errors ? `, ${formatCount(s.errors)} failed` : ''}`,
      calls: s.calls,
      errors: s.errors,
    }));

  const rightRaw = ranked.slice(0, MAX_TARGETS).map(([key, t]) => ({
    key,
    label: t.target,
    meta: `${TARGET_KIND_LABEL[t.kind] ?? t.kind}, ${formatCount(t.calls)} calls, ${formatMs(t.totalMs / t.calls)} avg`,
    calls: t.calls,
    errors: t.errors,
  }));
  if (rest.length) {
    const calls = rest.reduce((s, [, t]) => s + t.calls, 0);
    rightRaw.push({
      key: REST_KEY,
      label: `${rest.length} more targets`,
      meta: `${formatCount(calls)} calls`,
      calls,
      errors: rest.reduce((s, [, t]) => s + t.errors, 0),
    });
  }

  // One scale for both sides so band thickness means the same thing everywhere.
  const sideHeight = Math.max(320, Math.max(leftRaw.length, rightRaw.length) * (SLOT_MIN + GAP) + 80);
  const usable = (n: number) => sideHeight - GAP * (n - 1) - n * 6;
  const scale = Math.min(usable(leftRaw.length), usable(rightRaw.length)) / total;
  const left = layout(leftRaw, scale);
  const right = layout(rightRaw, scale);
  const height =
    Math.max(
      left.reduce((s, n) => s + n.slot + GAP, 0),
      right.reduce((s, n) => s + n.slot + GAP, 0),
    ) - GAP;

  const leftIndex = new Map(left.map((n) => [n.key, n]));
  const rightIndex = new Map(right.map((n) => [n.key, n]));

  // Stack links inside each node, ordered to minimise crossings.
  const ordered = [...links.values()].filter((l) => leftIndex.has(l.source) && rightIndex.has(l.target));
  const srcOffset = new Map<string, number>();
  const dstOffset = new Map<string, number>();
  const placed = new Map<string, { y0: number; y1: number }>();

  for (const l of [...ordered].sort((a, b) => rightIndex.get(a.target)!.y - rightIndex.get(b.target)!.y)) {
    const off = srcOffset.get(l.source) ?? 0;
    srcOffset.set(l.source, off + l.calls * scale);
    placed.set(`${l.source}→${l.target}`, { y0: leftIndex.get(l.source)!.y + off, y1: 0 });
  }
  for (const l of [...ordered].sort((a, b) => leftIndex.get(a.source)!.y - leftIndex.get(b.source)!.y)) {
    const off = dstOffset.get(l.target) ?? 0;
    dstOffset.set(l.target, off + l.calls * scale);
    placed.get(`${l.source}→${l.target}`)!.y1 = rightIndex.get(l.target)!.y + off;
  }

  const nodeTone = (n: Node) => (n.calls && (n.errors / n.calls) * 100 >= alertPct ? 'var(--color-ds-danger)' : 'var(--color-ds-ink)');

  return (
    <>
      <svg
        viewBox={`0 -6 ${W} ${height + 12}`}
        className="hidden h-auto w-full sm:block"
        role="img"
        aria-label="Database calls from each application to each table, function and service"
      >
        {ordered.map((l) => {
          const p = placed.get(`${l.source}→${l.target}`)!;
          const tone = health(l.calls, l.errors, l.slow, alertPct);
          const targetName = rightIndex.get(l.target)!.label;
          return (
            <path
              key={`${l.source}→${l.target}`}
              d={band(LEFT_BAR + BAR_W, p.y0, RIGHT_BAR, p.y1, Math.max(1, l.calls * scale))}
              fill={LINK_FILL[tone]}
              className="opacity-25 transition-opacity duration-150 hover:opacity-60"
            >
              <title>
                {`${sourceLabel(l.source)} → ${targetName}\n${l.calls.toLocaleString('en')} calls, ${l.errors.toLocaleString('en')} failed, ${formatMs(l.totalMs / l.calls)} avg`}
              </title>
            </path>
          );
        })}

        {left.map((n) => (
          <g key={n.key}>
            <rect x={LEFT_BAR} y={n.y} width={BAR_W} height={n.h} rx={2} fill={nodeTone(n)} />
            <text x={LEFT_BAR - 14} y={n.y + n.h / 2 - 3} textAnchor="end" className="fill-ds-ink text-[14px] font-medium">
              {n.label}
            </text>
            <text x={LEFT_BAR - 14} y={n.y + n.h / 2 + 14} textAnchor="end" className="fill-ds-muted text-[12px] tabular-nums">
              {n.meta}
            </text>
          </g>
        ))}

        {right.map((n) => (
          <g key={n.key}>
            <rect x={RIGHT_BAR} y={n.y} width={BAR_W} height={n.h} rx={2} fill={nodeTone(n)} />
            <text x={RIGHT_BAR + BAR_W + 14} y={n.y + n.h / 2 - 3} className="fill-ds-ink text-[14px] font-medium">
              {n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label}
            </text>
            <text x={RIGHT_BAR + BAR_W + 14} y={n.y + n.h / 2 + 14} className="fill-ds-muted text-[12px] tabular-nums">
              {n.meta}
            </text>
          </g>
        ))}
      </svg>

      {/* Phones: the same flows as a ranked list */}
      <ol className="space-y-2.5 sm:hidden">
        {[...ordered]
          .sort((a, b) => b.calls - a.calls)
          .slice(0, 12)
          .map((l) => {
            const tone = health(l.calls, l.errors, l.slow, alertPct);
            return (
              <li key={`${l.source}→${l.target}`} className="text-[13px]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-ds-ink">
                    {sourceLabel(l.source)} <span className="text-ds-muted">to</span> {rightIndex.get(l.target)!.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-ds-muted">{formatCount(l.calls)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ds-line">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(1, (l.calls / total) * 100)}%`, background: LINK_FILL[tone] }}
                  />
                </div>
              </li>
            );
          })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ds-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-ds-accent/40" aria-hidden="true" /> Healthy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-ds-warning/50" aria-hidden="true" /> 10% or more calls slow
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-ds-danger/50" aria-hidden="true" /> Failure rate at or above {alertPct}%
        </span>
        <span>Band width is call volume.</span>
      </div>
    </>
  );
}
