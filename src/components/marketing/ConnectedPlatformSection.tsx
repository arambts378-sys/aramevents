'use client';

import React from 'react';
import { useInView } from './useScrollReveal';
import { AramLogo } from '@/components/brand/AramLogo';

const reveal = (isInView: boolean) =>
  `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
  }`;

const LEFT_NODES = [
  {
    icon: 'edit_calendar',
    title: 'Create',
    subtitle: 'Your event, your brand',
    body: 'Set the dates, venue, agenda and ticket types, then style it with your own colours and logo.',
  },
  {
    icon: 'language',
    title: 'Publish',
    subtitle: 'Event website',
    body: 'A ready-to-share event page with the schedule, speakers, sponsors and a registration form.',
  },
  {
    icon: 'how_to_reg',
    title: 'Register',
    subtitle: 'Tickets and sign-ups',
    body: 'Free or paid tickets, custom questions and QR tickets sent to every attendee by email.',
  },
];

const RIGHT_NODES = [
  {
    icon: 'qr_code_scanner',
    title: 'Operate',
    subtitle: 'Event day',
    body: 'Volunteers scan tickets from their phones at every gate while you watch arrivals live.',
  },
  {
    icon: 'monitoring',
    title: 'Analyze',
    subtitle: 'After the event',
    body: 'Registrations, ticket sales and attendance in one report, with attendee lists ready to export.',
  },
];

function Node({ icon, title, subtitle, body }: (typeof LEFT_NODES)[number]) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md transition-colors duration-300 hover:border-stage-lamp/50 hover:bg-white/[0.09]">
      <div className="mb-2.5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stage-violet/25 text-[#CFC4FF] ring-1 ring-inset ring-white/10 transition-colors group-hover:bg-stage-lamp group-hover:text-stage-ink">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
        </div>
        <div>
          <h3 className="font-display text-[18px] font-bold tracking-tight text-white">{title}</h3>
          <p className="text-[12px] font-medium text-stage-lamp/90">{subtitle}</p>
        </div>
      </div>
      <p className="text-[13.5px] leading-relaxed text-white/65">{body}</p>
    </div>
  );
}

export function ConnectedPlatformSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      id="solutions"
      className="relative overflow-hidden bg-stage-paper py-24 select-none"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12">
        {/* Header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-stage-violet/20 bg-white px-3.5 py-1 shadow-xs ${reveal(isInView)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-stage-violet" />
            <span className="text-[12px] font-semibold text-stage-violet">One connected platform</span>
          </div>

          <h2 className={`font-display mb-4 text-3xl font-bold tracking-tight text-stage-ink sm:text-4xl lg:text-[42px] lg:leading-[1.1] ${reveal(isInView)} delay-100`}>
            Everything your event needs. Connected.
          </h2>

          <p className={`text-[16px] leading-relaxed text-stage-ink/70 ${reveal(isInView)} delay-200`}>
            Your website, tickets, check-in and reports share the same attendee list, so nothing has to be copied between tools.
          </p>
        </div>

        {/* Stage panel with the Aram hub in the middle */}
        <div
          className={`relative overflow-hidden rounded-[2rem] bg-stage-night p-6 shadow-[0_40px_80px_-40px_rgba(27,16,53,0.7)] sm:p-10 lg:p-14 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          {/* Stage lighting */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_45%,rgba(109,80,245,0.45),transparent_70%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[38rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,200,97,0.22),transparent_70%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.15] bg-[radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:26px_26px]" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-8">
            <div className="flex flex-col gap-5">
              {LEFT_NODES.map((node) => (
                <Node key={node.title} {...node} />
              ))}
            </div>

            {/* Hub */}
            <div className="my-6 flex flex-col items-center justify-center md:my-0">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <div
                  className="pointer-events-none absolute inset-0 animate-spin rounded-full border-2 border-dashed border-stage-lamp/35"
                  style={{ animationDuration: '40s' }}
                />
                <div className="pointer-events-none absolute -inset-5 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -inset-10 hidden rounded-full border border-white/5 md:block" />
                <div className="absolute inset-6 rounded-full bg-stage-violet/40 blur-2xl" />

                <div className="animate-float-subtle relative flex h-48 w-48 flex-col items-center justify-center rounded-full border border-white/20 bg-white p-6 text-center shadow-[0_0_60px_rgba(109,80,245,0.55)]">
                  <AramLogo size="md" />
                  <span className="mt-2 text-[12px] font-medium text-stage-ink/60">Events workspace</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <span className="live-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {RIGHT_NODES.map((node) => (
                <Node key={node.title} {...node} />
              ))}

              <div className="group relative h-32 overflow-hidden rounded-2xl border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80"
                  alt="Crowd in front of a lit stage"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-stage-night/95 via-stage-night/40 to-transparent p-4">
                  <span className="text-[12px] font-medium text-stage-lamp">Sat 20:00 · Main stage</span>
                  <span className="font-display text-[15px] font-bold tracking-tight text-white">
                    4,800 tickets scanned at the gates
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
