'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useInView } from './useScrollReveal';

const GUESTS = [
  { name: 'Ananya Rao', pass: 'General pass', gate: 'Gate A' },
  { name: 'Farhan Ali', pass: 'VIP pass', gate: 'VIP entrance' },
  { name: 'Meera Iyer', pass: 'Speaker pass', gate: 'VIP entrance' },
  { name: 'Karthik Menon', pass: 'General pass', gate: 'Gate B' },
  { name: 'Sneha Kulkarni', pass: 'General pass', gate: 'Gate C' },
];
const START_INSIDE = 1926;
const TICKETS = 2480;
const CYCLE_MS = 3600;

const POINTS = [
  {
    title: 'Scan with any phone',
    body: 'Volunteers check guests in with the phone they already carry. No extra hardware to hire.',
  },
  {
    title: 'Every gate, one count',
    body: 'Each entrance adds to the same total, so you always know how many people are inside.',
  },
  {
    title: 'Problems stop at the door',
    body: 'Cancelled or already-used tickets are flagged on the spot, before anyone walks in.',
  },
];

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);

// A fixed, QR-like pattern: three finder squares plus deterministic modules.
const QR_SIZE = 21;
const inFinder = (x: number, y: number) =>
  (x < 7 && y < 7) || (x >= QR_SIZE - 7 && y < 7) || (x < 7 && y >= QR_SIZE - 7);
const QR_MODULES = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
  const x = i % QR_SIZE;
  const y = Math.floor(i / QR_SIZE);
  if (inFinder(x, y)) return null;
  let h = Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) % 100 < 48 ? [x, y] : null;
}).filter((m): m is number[] => m !== null);

function QrCode() {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1.4" fill="currentColor" />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="1" fill="white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} className="h-full w-full text-stage-ink" aria-hidden="true">
      {finder(0, 0)}
      {finder(QR_SIZE - 7, 0)}
      {finder(0, QR_SIZE - 7)}
      {QR_MODULES.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" rx="0.2" fill="currentColor" />
      ))}
    </svg>
  );
}

export function EventOperationsSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const reduced = usePrefersReducedMotion();
  const [scan, setScan] = useState(0);

  // One scan per cycle while the section is on screen.
  useEffect(() => {
    if (!isInView || reduced) return;
    const id = setInterval(() => {
      if (!document.hidden) setScan((n) => n + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [isInView, reduced]);

  const guest = GUESTS[scan % GUESTS.length];
  const inside = START_INSIDE + scan;

  return (
    <section ref={ref} id="event-day" className="relative overflow-hidden bg-stage-night py-20 text-white sm:py-24 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute right-[-10rem] top-1/2 h-[36rem] w-[36rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(109,80,245,0.28),transparent_65%)]" />

      <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12 xl:gap-28 xl:px-16">
        {/* Words */}
        <div>
          <h2 className="font-display text-3xl font-bold tracking-[0.01em] sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
            When the event starts, everything should work.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-white/65">
            Doors open, the queue moves, and you can see who has arrived without asking anyone.
          </p>

          <dl className="mt-10 space-y-7">
            {POINTS.map((p) => (
              <div key={p.title} className="border-l border-white/15 pl-5">
                <dt className="font-display text-[18px] font-semibold">{p.title}</dt>
                <dd className="mt-1.5 max-w-md text-[15px] leading-relaxed text-white/60">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The door moment */}
        <figure className="mx-auto w-full max-w-[320px]">
          <div className="rounded-[2.5rem] border border-white/15 bg-stage-deep p-3 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)]">
            <div className="overflow-hidden rounded-[2rem] bg-white text-stage-ink">
              <div className="flex items-center justify-between px-5 pb-2 pt-4 text-[12px] text-stage-ink/55">
                <span>Gate check-in</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Online
                </span>
              </div>

              {/* Scanner window */}
              <div className="px-5 pt-2">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-stage-paper p-7">
                  <QrCode />
                  {/* Corner guides */}
                  {['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map((c) => (
                    <span key={c} aria-hidden="true" className={`absolute h-6 w-6 rounded-[4px] border-stage-violet ${c}`} />
                  ))}
                  {!reduced && (
                    <span
                      key={`sweep-${scan}`}
                      aria-hidden="true"
                      className="animate-scan-sweep absolute inset-x-5 h-0.5 rounded-full bg-stage-violet shadow-[0_0_18px_4px_rgba(109,80,245,0.45)]"
                    />
                  )}
                </div>
              </div>

              {/* Result */}
              <div className="px-5 pb-6 pt-5" aria-live="off">
                <div key={`result-${scan}`} className="animate-scan-result flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">check</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">Welcome, {guest.name.split(' ')[0]}</p>
                    <p className="truncate text-[12.5px] text-stage-ink/60">
                      {guest.pass}, {guest.gate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <figcaption className="mt-7 text-center">
            <p className="text-[15px] text-white/75">
              <span className="font-display text-[22px] font-bold tabular-nums text-white">{inside.toLocaleString('en-IN')}</span>{' '}
              of {TICKETS.toLocaleString('en-IN')} guests inside
            </p>
            <div className="mx-auto mt-3 h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-stage-lamp transition-[width] duration-700 ease-out"
                style={{ width: `${(inside / TICKETS) * 100}%` }}
              />
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
