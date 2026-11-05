'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { SETUP_STEPS, setupStepHref, setupStepIndex, type SetupProgress } from '@/lib/events/setupSteps';
import { useEventSetupProgress } from './useEventSetupProgress';

/**
 * Wraps the event pages. While an event is a draft, each setup step gets a floating
 * Back / Next bar, so the organizer can walk through the steps without returning to the workspace.
 */
export function EventSetupShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const eventId = useParams()?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();
  const event = getEvent(eventId);

  const index = setupStepIndex(pathname, eventId);
  const showBar = isHydrated && event?.status === 'draft' && index > 0;
  const progress = useEventSetupProgress(showBar ? event : undefined);
  // The website editor fills the screen, so only the essentials fit over its canvas.
  const compact = SETUP_STEPS[index]?.id === 'website';

  return (
    <div className={`contents ${showBar && !compact ? '[&_main]:pb-28' : ''}`}>
      {children}
      {showBar && <EventSetupBar eventId={eventId} index={index} progress={progress} compact={compact} />}
    </div>
  );
}

export function EventSetupBar({
  eventId,
  index,
  progress,
  compact,
}: {
  eventId: string;
  index: number;
  progress: SetupProgress | null;
  compact: boolean;
}) {
  const previous = SETUP_STEPS[index - 1];
  const next = SETUP_STEPS[index + 1];
  const workspaceHref = `/app/events/${eventId}`;

  return (
    <nav
      aria-label="Event setup steps"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 z-30 flex items-center justify-between gap-4 rounded-2xl border border-ds-line bg-white p-2 pl-4 shadow-xl shadow-black/10 font-jakarta md:max-w-[calc(100vw-260px-3rem)]"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ds-muted">
          Step {index + 1} of {SETUP_STEPS.length}
        </p>
        <p className="truncate text-[13px] font-semibold text-ds-ink">{SETUP_STEPS[index].label}</p>
      </div>

      {!compact && (
        <ol className="hidden xl:flex items-center gap-1.5" aria-hidden="true">
          {SETUP_STEPS.map((step, i) => (
            <li
              key={step.id}
              title={step.label}
              className={`h-1.5 w-7 rounded-full ${
                i === index ? 'bg-ds-accent' : progress?.[step.id] ? 'bg-ds-accent/40' : 'bg-ds-line'
              }`}
            />
          ))}
        </ol>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={previous ? setupStepHref(previous, eventId) : workspaceHref}
          className="inline-flex h-10 items-center rounded-xl border border-ds-line bg-white px-3 text-[13px] font-semibold text-ds-ink transition-colors hover:border-ds-accent hover:text-ds-accent"
        >
          Back
        </Link>
        <Link
          href={next ? setupStepHref(next, eventId) : workspaceHref}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ds-accent px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ds-accent-strong"
        >
          <span className="hidden sm:inline">{next ? `Next: ${next.label}` : 'Review & go live'}</span>
          <span className="sm:hidden">{next ? 'Next' : 'Finish'}</span>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
    </nav>
  );
}
