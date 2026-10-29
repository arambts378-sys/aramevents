'use client';

import React from 'react';
import Link from 'next/link';
import { useInView } from './useScrollReveal';

const reveal = (isInView: boolean) =>
  `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
  }`;

export function FinalCTA() {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section ref={ref} className="relative overflow-hidden bg-stage-night py-28 text-center select-none sm:py-32">
      {/* Venue photo */}
      <div
        className="animate-cinematic-zoom pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuB4v-a1XFMeuqrnjYjcsM9FEbvcPjzXWsxqNRz0m0YYi19mTlSNVFgRakYwXALHAGHRtrKBDgYQX5IdnuwwecuhcQO4o4yWwoymO-3nBU59l7gqthwOytxas2Gox5_X_PfhKPclfJw7K1bM-dSYE3A-9bhEu85rjhwGfZCFUFBMDDxM0rtv9V6sp7ZvIJQa2EVzz_WBFPtE9dizd2NQfmCBuyBwK8bMTRWcSWokYGeAQH33KwE9O6I4zA')`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stage-night via-stage-night/40 to-stage-night" />
      {/* Spotlight on the heading */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[48rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,200,97,0.25),transparent_65%)]" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 lg:px-12">
        <div className={`mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-xl ${reveal(isInView)}`}>
          <span className="live-pulse h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[12px] font-semibold text-white">Free to start</span>
        </div>

        <h2 className={`font-display mb-5 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl ${reveal(isInView)} delay-100`}>
          Your event starts here.
        </h2>

        <p className={`mb-10 max-w-xl text-balance text-[17px] leading-relaxed text-white/75 ${reveal(isInView)} delay-200`}>
          Create a free account, set up your first event and start taking registrations today.
        </p>

        <div className={`flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4 ${reveal(isInView)} delay-300`}>
          <Link
            href="/app/events/new"
            className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-stage-lamp px-8 py-4 text-[15px] font-bold text-stage-ink shadow-[0_10px_30px_-10px_rgba(255,200,97,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stage-night sm:w-auto"
          >
            <span className="material-symbols-outlined text-[19px]" aria-hidden="true">add_circle</span>
            <span>Create your event</span>
          </Link>
          <Link
            href="/pricing"
            className="flex w-full items-center justify-center whitespace-nowrap rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-[15px] font-bold text-white backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
