'use client';

import React from 'react';
import { useInView } from './useScrollReveal';

// One guest's record, followed through every stage. The point: it is the same record throughout.
const STAGES = [
  {
    icon: 'edit_calendar',
    title: 'Create',
    body: 'Set the dates, venue, agenda and ticket types, in your own colours and logo.',
    record: 'Chennai Product Summit is set up for 14 March',
  },
  {
    icon: 'language',
    title: 'Publish',
    body: 'Share an event website with the schedule, speakers and a registration form.',
    record: 'Ananya opens the event page from a link',
  },
  {
    icon: 'how_to_reg',
    title: 'Register',
    body: 'Guests pick a ticket, answer your questions and get a QR ticket by email.',
    record: 'Ananya registers and her ticket arrives',
  },
  {
    icon: 'qr_code_scanner',
    title: 'Check in',
    body: 'Volunteers scan tickets with their phones at every gate on event day.',
    record: 'Ananya is scanned in at Gate A, 9:12 am',
  },
  {
    icon: 'monitoring',
    title: 'Report',
    body: 'Registrations and attendance in one place, with the attendee list ready to download.',
    record: 'Ananya appears in the attendance export',
  },
];

export function ConnectedPlatformSection() {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section ref={ref} id="solutions" className="relative bg-stage-paper py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-[0.01em] text-stage-ink sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
            One attendee list, from the first ticket to the final report.
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-stage-ink/65">
            Your website, tickets, check-in and reports all use the same record, so nothing is copied between tools.
          </p>
        </div>

        <ol className="relative mt-14 grid grid-cols-1 gap-10 lg:mt-20 lg:grid-cols-5 lg:gap-8">
          {/* The thread: vertical on small screens, horizontal from lg */}
          <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-5 w-px bg-stage-ink/10 lg:hidden" />
          <span
            aria-hidden="true"
            className="absolute bottom-6 left-[19px] top-5 w-px origin-top bg-stage-violet transition-transform duration-[1600ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none lg:hidden"
            style={{ transform: `scaleY(${isInView ? 1 : 0})` }}
          />
          <span aria-hidden="true" className="absolute left-5 right-5 top-5 hidden h-px bg-stage-ink/10 lg:block" />
          <span
            aria-hidden="true"
            className="absolute left-5 right-5 top-5 hidden h-px origin-left bg-stage-violet transition-transform duration-[1600ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none lg:block"
            style={{ transform: `scaleX(${isInView ? 1 : 0})` }}
          />

          {STAGES.map((stage, i) => (
            <li key={stage.title} className="relative grid grid-cols-[40px_1fr] gap-x-5 lg:block">
              <span
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-500 motion-reduce:transition-none ${
                  isInView ? 'border-stage-violet bg-white text-stage-violet' : 'border-stage-ink/15 bg-stage-paper text-stage-ink/35'
                }`}
                style={{ transitionDelay: isInView ? `${150 + i * 300}ms` : '0ms' }}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{stage.icon}</span>
              </span>

              <div className="lg:mt-6">
                <h3 className="font-display text-[20px] font-bold tracking-[0.01em] text-stage-ink">{stage.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-stage-ink/65">{stage.body}</p>
                <div
                  className={`mt-5 flex items-start gap-3 rounded-xl bg-white p-3 shadow-[0_8px_24px_-16px_rgba(27,16,53,0.35)] ring-1 ring-stage-ink/[0.06] transition-[opacity,transform] duration-500 motion-reduce:transition-none ${
                    isInView ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
                  }`}
                  style={{ transitionDelay: isInView ? `${350 + i * 300}ms` : '0ms' }}
                >
                  {i === 0 ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stage-paper text-stage-violet">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">event</span>
                    </span>
                  ) : (
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        i === STAGES.length - 1 ? 'bg-stage-lamp text-stage-ink' : 'bg-stage-violet text-white'
                      }`}
                      aria-hidden="true"
                    >
                      AR
                    </span>
                  )}
                  <p className="text-[13.5px] leading-snug text-stage-ink/80">{stage.record}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
