import React from 'react';
import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="bg-stage-night text-white">
      <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 xl:px-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-[0.01em] sm:text-5xl lg:text-[56px]">
              Your event starts here.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-white/65">
              Create a free account, set up your first event and start taking registrations today.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app/events/new"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-stage-lamp px-7 text-[15px] font-bold text-stage-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stage-night"
            >
              Create your event
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              See pricing
            </Link>
          </div>
        </div>

        <p className="mt-14 border-t border-white/10 pt-6 text-[14px] text-white/50">
          Free for events up to 100 attendees. Upgrade only the events that need more.
        </p>
      </div>
    </section>
  );
}
