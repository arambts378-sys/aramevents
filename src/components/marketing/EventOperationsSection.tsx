'use client';

import React from 'react';
import { useInView, AnimatedCounter } from './useScrollReveal';

const reveal = (isInView: boolean) =>
  `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
  }`;

const GATES = [
  { name: 'Gate A', scanned: 742, capacity: 900 },
  { name: 'Gate B', scanned: 610, capacity: 800 },
  { name: 'Gate C', scanned: 418, capacity: 700 },
  { name: 'VIP and speakers', scanned: 156, capacity: 200 },
];

export function EventOperationsSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      id="event-day"
      className="relative overflow-hidden bg-stage-night py-16 text-white select-none sm:py-20 lg:py-24"
    >
      {/* Stage glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,200,97,0.16),transparent_65%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 right-0 h-96 w-[40rem] bg-[radial-gradient(ellipse,rgba(109,80,245,0.35),transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-10 flex flex-col justify-between gap-5 md:mb-14 md:flex-row md:items-end md:gap-6">
          <div className="max-w-2xl">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 backdrop-blur-sm ${reveal(isInView)}`}>
              <span className="live-pulse h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[12px] font-semibold text-white">Live on event day</span>
            </div>

            <h2 className={`font-display mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.1] ${reveal(isInView)} delay-100`}>
              When the event starts, everything should work.
            </h2>

            <p className={`text-[16px] leading-relaxed text-white/70 ${reveal(isInView)} delay-200`}>
              Check guests in at every gate and watch the numbers move as people arrive.
            </p>
          </div>
        </div>

        {/* Live dashboard */}
        <div
          className={`relative overflow-hidden rounded-[1.75rem] border border-white/15 shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          <div
            className="animate-cinematic-zoom pointer-events-none absolute inset-0 bg-cover bg-center opacity-35"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDEr9ruX6EZtJ_fWX4MrTnr09fQox8ii_d2xiQOnAYFoe017D4Q55KHOtMeKPd1jMyYAkpCjw5xcEqfZhqpULJlNhUGUkVhkwqQpXUvJDrdzZnAiLc-F8LDgqQtr-Mk1u00NhHRvH5oCC0xF5bK_suNbpLteQsL8Q88Oxh4HCXqLtpQz1CfhrcFNW7naIlZNKVU-nIkFDtEMlSCQObb1i_pIrQM0iDXBz3RklaHp7d1E7x4jXCfG1v5Hg')`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stage-night via-stage-night/85 to-stage-night/55" />

          <div className="relative z-10 p-4 sm:p-6 md:p-10">
            {/* Top status row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <span className="live-pulse h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-[15px] font-semibold text-white">Monsoon Music Festival</p>
                  <p className="text-[12.5px] text-white/60">Palace Grounds, Bengaluru · Sat 14 Dec</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[12.5px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">sync</span>
                Updating live
              </span>
            </div>

            {/* Metrics */}
            <div className="my-6 grid grid-cols-1 gap-3 sm:my-8 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 xl:gap-5">
              <Metric label="Checked in">
                <AnimatedCounter end={1926} />
                <Note tone="good" icon="arrow_upward">Up 214 in the last hour</Note>
              </Metric>
              <Metric label="Tickets sold" accent>
                <AnimatedCounter end={2480} />
                <Note>78% have arrived</Note>
              </Metric>
              <Metric label="Gates open">
                <AnimatedCounter end={4} />
                <Note tone="good" icon="check_circle">All scanners online</Note>
              </Metric>
              <Metric label="Arrivals per hour">
                <AnimatedCounter end={412} />
                <Note>Busiest at 18:00</Note>
              </Metric>
            </div>

            {/* Gate progress */}
            <div className="grid gap-4 rounded-2xl border border-white/10 bg-stage-deep/60 p-5 backdrop-blur-sm sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4">
              {GATES.map(({ name, scanned, capacity }) => (
                <div key={name}>
                  <div className="flex justify-between text-[13px]">
                    <span className="font-medium text-white/85">{name}</span>
                    <span className="tabular-nums text-white/55">{scanned} / {capacity}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-stage-violet to-stage-lamp transition-[width] duration-[1500ms] ease-out"
                      style={{ width: isInView ? `${(scanned / capacity) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Last scan */}
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-stage-ink">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">check</span>
                </span>
                <p className="text-[14px] text-white">
                  <span className="font-semibold">Ananya Rao</span>
                  <span className="text-white/60"> checked in with a General pass at Gate B</span>
                </p>
              </div>
              <span className="text-[13px] tabular-nums text-white/55">Just now · 17:42</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  const [value, note] = React.Children.toArray(children);
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md xl:p-6">
      <p className="mb-2 text-[13px] font-medium text-white/70">{label}</p>
      <div>
        <div className={`font-display text-4xl font-bold leading-none tracking-tight tabular-nums ${accent ? 'text-stage-lamp' : 'text-white'}`}>
          {value}
        </div>
        {note}
      </div>
    </div>
  );
}

function Note({ tone, icon, children }: { tone?: 'good'; icon?: string; children: React.ReactNode }) {
  return (
    <p className={`mt-2.5 flex items-center gap-1.5 text-[12.5px] ${tone === 'good' ? 'font-medium text-emerald-300' : 'text-white/60'}`}>
      {icon && <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{icon}</span>}
      {children}
    </p>
  );
}
