'use client';

import React from 'react';
import { useInView } from './useScrollReveal';

const POINTS = [
  {
    title: 'Attendance you can trust',
    body: 'Every ticket is scanned, so you know exactly who came and when they arrived.',
  },
  {
    title: 'Attendee lists, ready to download',
    body: 'Export names, tickets and check-in times for your team, sponsors or CRM.',
  },
  {
    title: 'Follow up the same week',
    body: 'Thank the people who came, share recordings, and invite them to the next one.',
  },
];

const ROWS = [
  { name: 'Ananya Rao', ticket: 'General', arrived: '9:12 am' },
  { name: 'Farhan Ali', ticket: 'VIP', arrived: '9:26 am' },
  { name: 'Meera Iyer', ticket: 'Speaker', arrived: '8:40 am' },
  { name: 'Karthik Menon', ticket: 'General', arrived: null },
  { name: 'Sneha Kulkarni', ticket: 'General', arrived: '10:03 am' },
];

const ATTENDED = 1812;
const REGISTERED = 2140;
const TURNOUT = Math.round((ATTENDED / REGISTERED) * 100);

export function PeopleDataSection() {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section ref={ref} id="resources" className="relative bg-stage-paper py-20 sm:py-24 lg:py-28">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12 xl:gap-28 xl:px-16">
        {/* The report */}
        <figure className="order-2 lg:order-1">
          <div className="rounded-2xl bg-white p-6 shadow-[0_40px_80px_-48px_rgba(27,16,53,0.45)] ring-1 ring-stage-ink/[0.06] sm:p-8">
            <p className="text-[13px] text-stage-ink/55">Attendance report</p>
            <p className="font-display mt-1 text-[19px] font-bold text-stage-ink">Chennai Product Summit</p>

            <div className="mt-6 flex items-end justify-between gap-4">
              <p className="font-display text-[56px] font-bold leading-none tracking-[0.01em] text-stage-ink">{TURNOUT}%</p>
              <p className="pb-1 text-right text-[13.5px] leading-snug text-stage-ink/60">
                {ATTENDED.toLocaleString('en-IN')} of {REGISTERED.toLocaleString('en-IN')}
                <br />
                registered guests came
              </p>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stage-paper">
              <div
                className="h-full rounded-full bg-stage-violet transition-[width] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{ width: isInView ? `${TURNOUT}%` : '0%' }}
              />
            </div>

            <table className="mt-7 w-full text-left text-[14px]">
              <thead>
                <tr className="text-[12.5px] text-stage-ink/50">
                  <th className="pb-2.5 font-medium">Guest</th>
                  <th className="hidden pb-2.5 font-medium sm:table-cell">Ticket</th>
                  <th className="pb-2.5 text-right font-medium">Arrived</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={r.name}
                    className={`border-t border-stage-ink/[0.07] transition-[opacity,transform] duration-500 motion-reduce:transition-none ${
                      isInView ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                    }`}
                    style={{ transitionDelay: isInView ? `${300 + i * 90}ms` : '0ms' }}
                  >
                    <td className="py-3 font-medium text-stage-ink">{r.name}</td>
                    <td className="hidden py-3 text-stage-ink/60 sm:table-cell">{r.ticket}</td>
                    <td className={`py-3 text-right tabular-nums ${r.arrived ? 'text-stage-ink/70' : 'text-stage-ink/35'}`}>
                      {r.arrived ?? 'Did not attend'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-stage-ink/[0.07] pt-5">
              <span className="whitespace-nowrap text-[13px] text-stage-ink/55">Showing 5 of {REGISTERED.toLocaleString('en-IN')}</span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-stage-night px-3.5 py-2 text-[13px] font-semibold text-white">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">download</span>
                <span className="sm:hidden">Download list</span>
                <span className="hidden sm:inline">Download attendee list</span>
              </span>
            </div>
          </div>
        </figure>

        {/* Words */}
        <div className="order-1 lg:order-2">
          <h2 className="font-display text-3xl font-bold tracking-[0.01em] text-stage-ink sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
            Events are about people. Know who came.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-stage-ink/65">
            Every registration and check-in adds up to a clear record, so the next event is easier to plan.
          </p>

          <dl className="mt-10 space-y-7">
            {POINTS.map((p) => (
              <div key={p.title} className="border-l border-stage-ink/15 pl-5">
                <dt className="font-display text-[18px] font-semibold text-stage-ink">{p.title}</dt>
                <dd className="mt-1.5 max-w-md text-[15px] leading-relaxed text-stage-ink/60">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
