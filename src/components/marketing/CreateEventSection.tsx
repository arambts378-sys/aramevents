'use client';

import React from 'react';
import { useInView } from './useScrollReveal';

const reveal = (isInView: boolean) =>
  `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
  }`;

const STEPS = [
  {
    step: '01',
    title: 'Plan',
    body: 'Add the dates, venue and rooms, set your capacity and draft the agenda for every track.',
  },
  {
    step: '02',
    title: 'Build',
    body: 'Create ticket types and prices, add speakers and sponsors, and design your event page.',
  },
  {
    step: '03',
    title: 'Publish',
    body: 'Go live with one click. Registrations and ticket sales start coming in straight away.',
  },
];

const FEATURES = [
  {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDIltSnMmWcm76XPVmNdEp20bZisR20yvA7VqqCewEEBRI9ro01pUwlauAl7KR2E13GFxq4nhtz7MHaVptSWDzL5vO53EZobI3Zb9zWDN7tw5Rr3RJA0siVdQ8c5WjEzeez_fX4j28Ss1TUwyB8x8TM9GUEBuT4cFoHM85PEwjyxz8bZDnD1e0DibpiBIYX29J-jBuJMfrGUdeZD8zxeA-U_tBDblR45-Y-95qUHvs05dQ6-p1RA4aeow',
    label: 'Tickets and passes',
    title: 'Passes that look like your event',
    body: 'Every attendee gets a QR ticket by email, ready to scan at the door.',
  },
  {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDqbmovF0WAYJ_O4juPcGejfdf2NKhzubMJkvtqi5wHqUn0gOb2YXs0BoWtqW0uHighl0DockbL5RkHZHwvXumN8DTTry9qybSjCZBxIa4yGzTecHA_BE9t9E0_PndrPCuSuUHuYLN4zk80gSlzo4koOdWoqcdHNfcXVSBojn6iexhhxC3RZuWWJeGbUhm8G-9RPq15EGLEBfPipJE9XNpXZ89cYLCC6Phf7jspN14dOq7fEvy5aSK4Kg',
    label: 'Venues',
    title: 'Venues, rooms and capacity',
    body: 'Keep every hall and room in one place, with limits on how many people each one holds.',
  },
  {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBRE2Plq0zL1AScKdUrdC2W00av5DTpHHWQbg7kJv8PzzsC76esIthBqlfK6nmUO0LutB87g7YIAhhvqf2-sZaj00zhNxsyTJOiAekSP8utwvifdy_hILt9tG3PJOu2mgSYCW1ZBV9_R55WSjiaSFskyWGiL_OXwP6jXlNhrZdfUcp6eGQaOZ8iN8-JsYYEdf5ejOyqfFwk8MTBGBZ8Es62Ap8I76mkNm4P0ybZX3Zee_qLEc4bpeNulw',
    label: 'Speakers',
    title: 'Speakers ready on time',
    body: 'Profiles, session times and rooms for every speaker, published to your agenda.',
  },
];

export function CreateEventSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section ref={ref} id="features" className="relative bg-white py-24 select-none">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-14 max-w-3xl">
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-stage-violet/20 bg-stage-paper px-3.5 py-1 ${reveal(isInView)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-stage-violet" />
            <span className="text-[12px] font-semibold text-stage-violet">Before the doors open</span>
          </div>

          <h2 className={`font-display mb-4 text-3xl font-bold tracking-tight text-stage-ink sm:text-4xl lg:text-[42px] lg:leading-[1.1] ${reveal(isInView)} delay-100`}>
            Create your event easily.
          </h2>

          <p className={`text-[16px] leading-relaxed text-stage-ink/70 ${reveal(isInView)} delay-200`}>
            From the first idea to a live event, bring everything together without unnecessary complexity.
          </p>
        </div>

        {/* Plan -> Build -> Publish, joined by one line */}
        <ol className="relative mb-16 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <div aria-hidden="true" className="absolute left-[16.6%] right-[16.6%] top-[2.1rem] hidden h-px bg-gradient-to-r from-stage-violet/0 via-stage-violet/40 to-stage-violet/0 md:block" />
          {STEPS.map(({ step, title, body }, i) => (
            <li
              key={step}
              className={`relative rounded-2xl border border-stage-ink/[0.08] bg-stage-paper/60 p-6 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-stage-night font-display text-[15px] font-bold text-stage-lamp shadow-[0_8px_20px_-8px_rgba(27,16,53,0.6)]">
                {step}
              </div>
              <h3 className="font-display mb-1.5 text-[20px] font-bold tracking-tight text-stage-ink">{title}</h3>
              <p className="text-[14px] leading-relaxed text-stage-ink/65">{body}</p>
            </li>
          ))}
        </ol>

        {/* Main photo + feature cards */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
          <div
            className={`group relative min-h-[460px] overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-40px_rgba(27,16,53,0.65)] lg:col-span-7 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDySdWutLYbDD_qLT-LGGc7zd53nZ-nb83NWb7yar_ejUekbaB1nVFfrpjc5Rqv6pXtwVmls-lELw716uG59MSTXYNIujQZugU9V8pBXYEtUGeTJ_4x4YiBqU7OykXlDex4E8LXC-T0fQt-XLhMlbgVjKUpt2a2ZHf-eorNoqGtDun6N1AET5yfvMjYOEBtGjDbx6fOoJMwrx8W25mJYoRMLyM3yhfghocwS_7kOPey_pzbHqDJCrqvMw')`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stage-night via-stage-night/30 to-transparent" />

            {/* Floating "event is live" chip */}
            <div className="absolute right-5 top-5 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">event_available</span>
              </span>
              <div>
                <p className="text-[13px] font-bold text-stage-ink">Event published</p>
                <p className="text-[12px] text-stage-ink/60">128 registrations today</p>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10 p-8 text-white">
              <span className="mb-3 inline-block rounded-full bg-stage-lamp px-3 py-1 text-[12px] font-semibold text-stage-ink">
                Organizer dashboard
              </span>
              <h3 className="font-display mb-2 text-2xl font-bold tracking-tight sm:text-[28px]">
                Everything ready before doors open
              </h3>
              <p className="max-w-xl text-[14.5px] leading-relaxed text-white/80">
                See ticket sales, the agenda, your speakers and your team&apos;s tasks on one screen, so nothing is left for the last minute.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-5">
            {FEATURES.map(({ image, label, title, body }, i) => (
              <div
                key={title}
                className={`group flex flex-1 items-center gap-5 rounded-2xl border border-stage-ink/[0.08] bg-white p-4 shadow-[0_12px_30px_-18px_rgba(27,16,53,0.35)] transition-all duration-500 hover:border-stage-violet/40 ${
                  isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
                }`}
                style={{ transitionDelay: `${400 + i * 100}ms` }}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url('${image}')` }}
                  />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-stage-violet">{label}</span>
                  <h4 className="font-display text-[17px] font-bold tracking-tight text-stage-ink">{title}</h4>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-stage-ink/65">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
