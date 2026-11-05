'use client';

import React from 'react';
import Link from 'next/link';
import type { Event } from '@/types';
import {
  SETUP_STEPS,
  completedSetupSteps,
  isReadyToGoLive,
  nextSetupStep,
  setupStepHref,
} from '@/lib/events/setupSteps';
import { useEventSetupProgress } from './useEventSetupProgress';

/** The checklist on a draft event's workspace: what's done, and what to do next. */
export function EventSetupCard({ event, onGoLive, goingLive }: { event: Event; onGoLive: () => void; goingLive: boolean }) {
  const progress = useEventSetupProgress(event);

  if (!progress) {
    return <div className="h-72 rounded-2xl border border-ds-line bg-white animate-pulse" />;
  }

  const done = completedSetupSteps(progress);
  const upNext = nextSetupStep(progress);
  const ready = isReadyToGoLive(progress);

  return (
    <section className="rounded-2xl border border-ds-line bg-white p-6 sm:p-7 shadow-xs" aria-labelledby="event-setup-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 id="event-setup-title" className="text-[19px] font-bold text-ds-ink font-space">
            {ready ? 'Your event is ready to go live' : 'Finish setting up your event'}
          </h2>
          <p className="text-[13px] text-ds-muted font-jakarta mt-0.5">
            {done} of {SETUP_STEPS.length} steps done
            {ready && upNext ? '. The remaining steps are optional.' : ''}
          </p>
        </div>

        {ready ? (
          <button
            type="button"
            onClick={onGoLive}
            disabled={goingLive}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-10 shrink-0 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white font-semibold text-[13px] transition-colors shadow-xs font-jakarta disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">publish</span>
            <span>Go Live</span>
          </button>
        ) : upNext && (
          <Link
            href={setupStepHref(upNext, event.id)}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-10 shrink-0 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white font-semibold text-[13px] transition-colors shadow-xs font-jakarta"
          >
            <span>Next: {upNext.label}</span>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
          </Link>
        )}
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-ds-line overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-ds-accent transition-all" style={{ width: `${(done / SETUP_STEPS.length) * 100}%` }} />
      </div>

      <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SETUP_STEPS.map((step, index) => {
          const isDone = progress[step.id];
          const isNext = upNext?.id === step.id;
          return (
            <li key={step.id}>
              <Link
                href={setupStepHref(step, event.id)}
                aria-current={isNext ? 'step' : undefined}
                className={`group flex h-full items-start gap-3 rounded-xl border p-4 transition-colors ${
                  isNext ? 'border-ds-accent bg-ds-accent-soft/40' : 'border-ds-line hover:border-ds-accent/60'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold font-jakarta ${
                    isDone ? 'bg-ds-accent text-white' : 'bg-ds-accent-soft text-ds-accent'
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[18px]" aria-label="Done">check</span>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 text-[14px] font-bold text-ds-ink font-space">
                    {step.label}
                    {step.optional && <span className="text-[11px] font-medium text-ds-muted font-jakarta">Optional</span>}
                  </span>
                  <span className="block mt-0.5 text-[12px] leading-relaxed text-ds-muted font-jakarta">{step.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
