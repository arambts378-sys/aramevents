'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useInView } from './useScrollReveal';

type StepId = 'plan' | 'build' | 'publish';

const STEPS: { id: StepId; title: string; body: string; checklist: string[] }[] = [
  {
    id: 'plan',
    title: 'Plan',
    body: 'Set the dates, venue and rooms, cap each room, and lay out the agenda track by track.',
    checklist: ['Dates, time zone and venue', 'Rooms with seat limits', 'Agenda tracks and sessions'],
  },
  {
    id: 'build',
    title: 'Build',
    body: 'Create ticket types, add speakers and sponsors, and shape the event website from a template.',
    checklist: ['Ticket types and capacity', 'Speaker and sponsor profiles', 'Event website from a template'],
  },
  {
    id: 'publish',
    title: 'Publish',
    body: 'Go live in one click. Registrations arrive straight away and every attendee gets a QR ticket.',
    checklist: ['Public event page and registration form', 'QR tickets sent by email', 'Live registration numbers'],
  },
];

const CAPABILITIES = [
  {
    icon: 'confirmation_number',
    title: 'Passes that look like your event',
    body: 'Every attendee gets a QR ticket by email, ready to scan at the door.',
  },
  {
    icon: 'meeting_room',
    title: 'Venues, rooms and capacity',
    body: 'Every hall and room in one place, with limits on how many people each one holds.',
  },
  {
    icon: 'record_voice_over',
    title: 'Speakers ready on time',
    body: 'Profiles, session times and rooms for every speaker, published to your agenda.',
  },
];

/* ---------- Product window: one screen per step ---------- */

const NAV: { id: StepId | 'people'; icon: string; label: string }[] = [
  { id: 'plan', icon: 'event_note', label: 'Details' },
  { id: 'build', icon: 'confirmation_number', label: 'Tickets' },
  { id: 'publish', icon: 'monitoring', label: 'Overview' },
  { id: 'people', icon: 'group', label: 'People' },
];

/** A light app window: a slim sidebar that follows the selected step, a top bar, and the step's screen. */
function AppWindow({ step, status, children }: { step: StepId; status: 'Draft' | 'Live'; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-30px_rgba(23,20,42,0.35)] ring-1 ring-stage-ink/[0.08]">
      <div className="flex items-center justify-between gap-3 border-b border-stage-ink/[0.07] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stage-paper text-stage-violet">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-stage-ink">Chennai Product Summit 2026</p>
            <p className="truncate text-[12px] text-stage-ink/50">14–15 March, Chennai Trade Centre</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
            status === 'Live' ? 'bg-emerald-50 text-emerald-700' : 'bg-stage-paper text-stage-ink/60'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'Live' ? 'bg-emerald-500' : 'bg-stage-ink/30'}`} aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="flex min-h-[360px]">
        <nav className="hidden w-40 shrink-0 border-r border-stage-ink/[0.07] bg-[#FBFAFE] p-3 sm:block" aria-hidden="true">
          {NAV.map((n) => {
            const on = n.id === step;
            return (
              <span
                key={n.id}
                className={`mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                  on ? 'bg-white font-semibold text-stage-ink shadow-[0_1px_2px_rgba(23,20,42,0.08)] ring-1 ring-stage-ink/[0.06]' : 'text-stage-ink/55'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${on ? 'text-stage-violet' : ''}`}>{n.icon}</span>
                {n.label}
              </span>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-stage-ink/50">{label}</p>
      <p className="mt-1 rounded-lg border border-stage-ink/10 bg-white px-3 py-2 text-[13.5px] text-stage-ink">{value}</p>
    </div>
  );
}

function PlanScreen() {
  const rooms = [
    { name: 'Main hall', seats: 1200, booked: 0.82 },
    { name: 'Hall B', seats: 400, booked: 0.64 },
    { name: 'Workshop room', seats: 80, booked: 0.95 },
  ];
  return (
    <AppWindow step="plan" status="Draft">
      <p className="text-[15px] font-semibold text-stage-ink">Event details</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Starts" value="14 Mar 2026, 9:00 am" />
        <Field label="Ends" value="15 Mar 2026, 6:00 pm" />
        <Field label="Venue" value="Chennai Trade Centre" />
        <Field label="Agenda" value="3 tracks, 24 sessions" />
      </div>
      <p className="mt-6 text-[13px] font-semibold text-stage-ink">Rooms</p>
      <ul className="mt-3 space-y-3">
        {rooms.map((r) => (
          <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
            <span className="text-[13px] text-stage-ink">{r.name}</span>
            <span className="text-[12.5px] tabular-nums text-stage-ink/50">{r.seats.toLocaleString('en-IN')} seats</span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-stage-paper">
              <span className="block h-full rounded-full bg-stage-violet" style={{ width: `${r.booked * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </AppWindow>
  );
}

function BuildScreen() {
  const tickets = [
    { name: 'General admission', price: 'Free', sold: 812, qty: 1000 },
    { name: 'Delegate pass', price: '₹2,500', sold: 214, qty: 300 },
    { name: 'VIP', price: '₹7,500', sold: 41, qty: 50 },
  ];
  const speakers = ['AR', 'MK', 'SP', 'JV', 'NR'];
  return (
    <AppWindow step="build" status="Draft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-stage-ink">Ticket types</p>
        <span className="inline-flex items-center gap-1 rounded-lg bg-stage-night px-3 py-1.5 text-[12px] font-semibold text-white">
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">add</span>
          Add ticket
        </span>
      </div>
      <ul className="mt-4 divide-y divide-stage-ink/[0.07] rounded-xl border border-stage-ink/[0.08]">
        {tickets.map((t) => (
          <li key={t.name} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-stage-ink">{t.name}</p>
              <p className="text-[12px] tabular-nums text-stage-ink/50">
                {t.sold.toLocaleString('en-IN')} of {t.qty.toLocaleString('en-IN')} taken
              </p>
            </div>
            <span className="text-[13.5px] font-semibold tabular-nums text-stage-ink">{t.price}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center">
          {speakers.map((s, i) => (
            <span
              key={s}
              className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-stage-paper text-[10.5px] font-semibold text-stage-violet first:ml-0"
              style={{ zIndex: speakers.length - i }}
            >
              {s}
            </span>
          ))}
        </div>
        <span className="text-[12.5px] text-stage-ink/55">12 speakers confirmed</span>
      </div>
    </AppWindow>
  );
}

function PublishScreen() {
  const week = [42, 58, 51, 77, 96, 110, 128];
  const max = Math.max(...week);
  return (
    <AppWindow step="publish" status="Live">
      <div className="flex items-center gap-2 rounded-lg bg-stage-paper px-3 py-2 text-[12.5px] text-stage-ink/70">
        <span className="material-symbols-outlined text-[16px] text-stage-violet" aria-hidden="true">link</span>
        <span className="truncate">aram.events/events/chennai-product-summit</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-stage-ink/[0.08] p-4">
          <p className="text-[12px] text-stage-ink/50">Registrations today</p>
          <p className="font-display mt-1 text-[26px] font-bold tracking-[0.01em] text-stage-ink">128</p>
        </div>
        <div className="rounded-xl border border-stage-ink/[0.08] p-4">
          <p className="text-[12px] text-stage-ink/50">Seats filled</p>
          <p className="font-display mt-1 text-[26px] font-bold tracking-[0.01em] text-stage-ink">
            1,342 <span className="text-[14px] font-medium text-stage-ink/40">/ 1,680</span>
          </p>
        </div>
      </div>
      <p className="mt-5 text-[13px] font-semibold text-stage-ink">Registrations, last 7 days</p>
      <div className="mt-3 flex h-24 items-end gap-2" role="img" aria-label="Registrations rising from 42 to 128 a day over the last week">
        {week.map((v, i) => (
          <div
            key={i}
            className={`flex-1 rounded-md ${i === week.length - 1 ? 'bg-stage-violet' : 'bg-stage-violet/20'}`}
            style={{ height: `${(v / max) * 100}%` }}
          />
        ))}
      </div>
    </AppWindow>
  );
}

const SCREENS: Record<StepId, () => React.ReactElement> = {
  plan: PlanScreen,
  build: BuildScreen,
  publish: PublishScreen,
};

/* ---------- Section ---------- */

export function CreateEventSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });
  const [active, setActive] = useState<StepId>('plan');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const Screen = SCREENS[active];

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + STEPS.length) % STEPS.length;
    setActive(STEPS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section ref={ref} id="features" className="relative bg-white py-20 sm:py-24">
      <div
        className={`mx-auto max-w-[1600px] px-5 transition-opacity duration-700 motion-reduce:transition-none sm:px-8 lg:px-12 xl:px-16 ${
          isInView ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex flex-col gap-6 border-b border-stage-ink/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-[0.01em] text-stage-ink sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
              From first draft to doors open, in three steps.
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-stage-ink/65">
              One workspace for the event, its website, tickets and people. Nothing to stitch together.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/organizer/register"
              className="inline-flex min-h-11 items-center rounded-lg bg-stage-night px-5 text-[14px] font-semibold text-white transition-colors hover:bg-stage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet focus-visible:ring-offset-2"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-lg border border-stage-ink/15 px-5 text-[14px] font-semibold text-stage-ink transition-colors hover:bg-stage-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet focus-visible:ring-offset-2"
            >
              See pricing
            </Link>
          </div>
        </div>

        {/* Stepper + product window */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <div role="tablist" aria-label="Event setup steps" aria-orientation="vertical" className="lg:col-span-5">
            {STEPS.map((step, i) => {
              const selected = step.id === active;
              return (
                <div key={step.id} className="relative border-l-2 pl-6 pb-2 last:pb-0" style={{ borderColor: selected ? 'var(--color-stage-violet)' : 'rgb(23 20 42 / 0.1)' }}>
                  <button
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="tab"
                    id={`step-tab-${step.id}`}
                    aria-selected={selected}
                    aria-controls="step-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(step.id)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className="group flex w-full items-center gap-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet focus-visible:ring-offset-4 rounded-md"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-bold transition-colors ${
                        selected ? 'bg-stage-night text-stage-lamp' : 'bg-stage-paper text-stage-ink/50 group-hover:text-stage-ink'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`font-display text-[22px] font-bold tracking-[0.01em] transition-colors ${selected ? 'text-stage-ink' : 'text-stage-ink/45 group-hover:text-stage-ink/80'}`}>
                      {step.title}
                    </span>
                  </button>
                  {selected && (
                    <div className="pb-5 pl-[52px]">
                      <p className="text-[15px] leading-relaxed text-stage-ink/70">{step.body}</p>
                      <ul className="mt-4 space-y-2">
                        {step.checklist.map((item) => (
                          <li key={item} className="flex items-center gap-2.5 text-[14px] text-stage-ink">
                            <span className="material-symbols-outlined text-[18px] text-stage-violet" aria-hidden="true">check_circle</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            id="step-panel"
            role="tabpanel"
            aria-labelledby={`step-tab-${active}`}
            className="relative overflow-hidden rounded-[28px] bg-stage-paper p-3 sm:p-6 lg:col-span-7 lg:p-8"
          >
            {/* Soft light behind the window: the backdrop frames the product, the product carries the detail */}
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(109,80,245,0.18),transparent_70%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,200,97,0.22),transparent_70%)]" />
            <div key={active} className="relative animate-step-swap">
              <Screen />
            </div>
          </div>
        </div>

        {/* Capabilities: one divided strip */}
        <ul className="mt-14 grid grid-cols-1 divide-y divide-stage-ink/10 border-y border-stage-ink/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="flex gap-4 py-6 md:px-6 md:first:pl-0 md:last:pr-0">
              <span className="material-symbols-outlined mt-0.5 text-[24px] text-stage-violet" aria-hidden="true">{c.icon}</span>
              <div>
                <h3 className="font-display text-[17px] font-bold tracking-[0.01em] text-stage-ink">{c.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-stage-ink/65">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
