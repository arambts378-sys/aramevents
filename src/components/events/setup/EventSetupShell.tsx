'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { SETUP_STEPS, setupStepHref, setupStepIndex, type SetupProgress } from '@/lib/events/setupSteps';
import { useEventSetupProgress } from './useEventSetupProgress';
import { Sidebar } from '@/components/dashboard/Sidebar';

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

  const framed = framedPage(pathname, eventId);
  const content = framed ? (
    <EventPageFrame eventId={eventId} eventName={event?.name} section={framed}>
      {children}
    </EventPageFrame>
  ) : (
    children
  );

  return (
    <div className={`contents ${showBar && !compact ? '[&_main]:pb-28 [&_.event-page-body]:pb-28' : ''}`}>
      {content}
      {showBar && <EventSetupBar eventId={eventId} index={index} progress={progress} compact={compact} />}
    </div>
  );
}

/**
 * Event pages that do not draw the app sidebar themselves. The others (the workspace, tickets,
 * speakers, sponsors, QR & Access) include it already, and the website editor and the check-in
 * scanner are full screen on purpose.
 */
const FRAMED_PAGES: { path: string; label: string; parent?: { path: string; label: string } }[] = [
  { path: 'registration', label: 'Registration' },
  { path: 'people', label: 'People' },
  { path: 'integrations', label: 'Integrations' },
  { path: 'analytics', label: 'Analytics' },
  { path: 'operations/volunteers', label: 'Volunteers', parent: { path: 'operations/access-control', label: 'QR & Access' } },
];

function framedPage(pathname: string | null, eventId: string) {
  if (!pathname || !eventId) return null;
  const rest = pathname.replace(/\/+$/, '').split(`/app/events/${eventId}/`)[1];
  return FRAMED_PAGES.find((p) => p.path === rest) ?? null;
}

/** The app sidebar plus a breadcrumb back to the event, for pages that would otherwise have neither. */
function EventPageFrame({
  eventId,
  eventName,
  section,
  children,
}: {
  eventId: string;
  eventName?: string;
  section: (typeof FRAMED_PAGES)[number];
  children: React.ReactNode;
}) {
  const { currentUser } = useAppContext();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const workspace = `/app/events/${eventId}`;

  return (
    <div className="min-h-screen w-full bg-ds-canvas text-ds-ink antialiased">
      <div className="flex min-h-screen w-full flex-row">
        <Sidebar currentUser={currentUser} mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="event-page-body flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-ds-line bg-ds-canvas/90 px-3 backdrop-blur sm:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ds-muted hover:bg-ds-subtle hover:text-ds-ink md:hidden"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">menu</span>
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-ds-muted">
                <li className="hidden shrink-0 sm:block">
                  <Link href="/app/events" className="hover:text-ds-ink">Events</Link>
                </li>
                <li className="hidden shrink-0 sm:block" aria-hidden="true">/</li>
                <li className="min-w-0">
                  <Link href={workspace} className="flex min-w-0 items-center gap-1 hover:text-ds-ink">
                    <span className="material-symbols-outlined text-[16px] sm:hidden" aria-hidden="true">arrow_back</span>
                    <span className="truncate">{eventName || 'Event'}</span>
                  </Link>
                </li>
                {section.parent && (
                  <>
                    <li className="shrink-0" aria-hidden="true">/</li>
                    <li className="shrink-0">
                      <Link href={`${workspace}/${section.parent.path}`} className="hover:text-ds-ink">{section.parent.label}</Link>
                    </li>
                  </>
                )}
                <li className="shrink-0" aria-hidden="true">/</li>
                <li className="shrink-0 font-medium text-ds-ink" aria-current="page">{section.label}</li>
              </ol>
            </nav>
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
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
