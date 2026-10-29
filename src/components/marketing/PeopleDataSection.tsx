'use client';

import React from 'react';
import { useInView, AnimatedCounter } from './useScrollReveal';

const reveal = (isInView: boolean) =>
  `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
  }`;

const JOURNEY = [
  { icon: 'celebration', title: 'Event', body: 'Keynotes, workshops and sessions' },
  { icon: 'qr_code_2', title: 'Check-ins', body: 'Every ticket scanned at the door' },
  { icon: 'badge', title: 'Attendees', body: 'One record for every person' },
  { icon: 'insights', title: 'Reports', body: 'Turnout, sales and arrivals' },
  { icon: 'event_repeat', title: 'Next event', body: 'Invite the people who came' },
];

const OUTCOMES = [
  {
    icon: 'fact_check',
    title: 'Attendance you can trust',
    body: 'Know exactly who registered, who turned up and when they arrived, because every ticket is scanned.',
  },
  {
    icon: 'download',
    title: 'Attendee lists, ready to export',
    body: 'Download attendees with their ticket type and check-in time for your team, sponsors or CRM.',
  },
  {
    icon: 'forward_to_inbox',
    title: 'Follow up the same week',
    body: 'Email the people who attended with thanks, session recordings or your next event.',
  },
];

export function PeopleDataSection() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section ref={ref} id="resources" className="relative bg-stage-paper py-24 select-none">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Section Header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-stage-violet/20 bg-white px-3.5 py-1 ${reveal(isInView)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-stage-violet" />
            <span className="text-[12px] font-semibold text-stage-violet">After the event</span>
          </div>

          <h2 className={`font-display mb-4 text-3xl font-bold tracking-tight text-stage-ink sm:text-4xl lg:text-[42px] lg:leading-[1.1] ${reveal(isInView)} delay-100`}>
            Events are about people. Data makes them better.
          </h2>

          <p className={`text-[16px] leading-relaxed text-stage-ink/70 ${reveal(isInView)} delay-200`}>
            Every registration and check-in builds a clear picture of who came, so the next event is easier to plan.
          </p>
        </div>

        {/* Journey strip */}
        <ol
          className={`relative mb-14 grid grid-cols-2 gap-6 rounded-[1.75rem] bg-white p-6 shadow-[0_20px_50px_-30px_rgba(27,16,53,0.35)] md:grid-cols-5 md:gap-4 lg:p-8 transition-all duration-700 delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-[3.25rem] hidden border-t-2 border-dashed border-stage-violet/20 md:block lg:top-[3.75rem]" />
          {JOURNEY.map(({ icon, title, body }, i) => {
            const last = i === JOURNEY.length - 1;
            return (
              <li key={title} className={`relative text-center ${last ? 'col-span-2 md:col-span-1' : ''}`}>
                <span
                  className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-8 ring-white ${
                    last ? 'bg-stage-lamp text-stage-ink' : 'bg-stage-night text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{icon}</span>
                </span>
                <p className="font-display mt-3 text-[17px] font-bold tracking-tight text-stage-ink">{title}</p>
                <p className="mt-0.5 text-[13px] text-stage-ink/60">{body}</p>
              </li>
            );
          })}
        </ol>

        {/* Photos + outcomes */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            <Photo
              isInView={isInView}
              delay={350}
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuCsZoLRYOhlrKNJuk61SjvtgyJbvQ8uj58GdFn5I9LTU_JigRu_DnT7oiFrRAYdxJOmIiW2rBQNnvVGFboJ72q7uMzI6nCrByRPiyUh9JGsNVk49PWdqkw3Fb0xWDmbJhtcY-8mVuuDGPJL9wAI-A_lrVFfmi9DoXl361kyerqDNneJgqTakT9OsGc0RbaHVK7jkjSVm0_samG-uZ1eKwX6Gei6I3nkvdXAAXj3Zbz88DgF4_8Ua74xww"
              stat={<><AnimatedCounter end={85} suffix="%" /> turnout</>}
              caption="1,812 of 2,140 registered guests attended"
            />
            <Photo
              isInView={isInView}
              delay={450}
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuA6zDqnivjGaBz6TTJykfF9-BMPjRPWAP03WCVKxC3d7shtR2-wj1BOQ9PHBWad8lhH3LOU9f_1LxBi2NXqPfQ-53x-W2OBFBTfVCpUEtN7NNLVoDHUo4-b7rRXxZzvyflfCecm_gKA7_rdVX4Ffh5zcuwTdffEDAaJCuZCOAG1_Hh1WpwCsHdDr5dbNd1JrJD0Ff_IxtesmwS5Y7YX9Pfa-bquum7vS9k06W7vGc-U4YKSmW9soAle2Q"
              stat={<><AnimatedCounter end={640} /> workshop seats</>}
              caption="Filled across 12 sessions"
            />
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            {OUTCOMES.map(({ icon, title, body }, i) => (
              <div
                key={title}
                className={`flex flex-1 gap-4 rounded-2xl border border-stage-ink/[0.08] bg-white p-5 transition-all duration-500 hover:border-stage-violet/40 ${
                  isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
                }`}
                style={{ transitionDelay: `${400 + i * 100}ms` }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stage-violet/10 text-stage-violet">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
                </span>
                <div>
                  <h3 className="font-display text-[17px] font-bold tracking-tight text-stage-ink">{title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-stage-ink/65">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Photo({
  isInView,
  delay,
  image,
  stat,
  caption,
}: {
  isInView: boolean;
  delay: number;
  image: string;
  stat: React.ReactNode;
  caption: string;
}) {
  return (
    <div
      className={`group relative h-80 overflow-hidden rounded-[1.5rem] shadow-[0_30px_60px_-35px_rgba(27,16,53,0.6)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url('${image}')` }}
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-stage-night/90 via-stage-night/10 to-transparent p-5">
        <span className="font-display text-[22px] font-bold tracking-tight text-white">{stat}</span>
        <span className="text-[13px] text-white/75">{caption}</span>
      </div>
    </div>
  );
}
