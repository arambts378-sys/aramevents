/** The guided path an organizer follows from a new draft event to going live. */

export type SetupStepId = 'details' | 'website' | 'registration' | 'tickets' | 'people' | 'sponsors' | 'access';

export type SetupProgress = Record<SetupStepId, boolean>;

export interface SetupStep {
  id: SetupStepId;
  label: string;
  description: string;
  icon: string;
  /** Path under /app/events/[eventId]. Empty for the workspace page itself. */
  path: string;
  optional?: boolean;
}

export const SETUP_STEPS: SetupStep[] = [
  { id: 'details', label: 'Event details', description: 'Name, date, time and location.', icon: 'event_note', path: '' },
  { id: 'website', label: 'Website', description: 'Design and publish your event page.', icon: 'web', path: '/website/editor' },
  { id: 'registration', label: 'Registration', description: 'Open sign-ups and set capacity.', icon: 'how_to_reg', path: '/registration' },
  { id: 'tickets', label: 'Tickets & Pricing', description: 'Add ticket types and prices.', icon: 'sell', path: '/tickets' },
  { id: 'people', label: 'People & Team', description: 'Add attendees, staff and speakers.', icon: 'badge', path: '/people', optional: true },
  { id: 'sponsors', label: 'Sponsors & Partners', description: 'Track who pays and what is still due.', icon: 'handshake', path: '/sponsors', optional: true },
  { id: 'access', label: 'QR & Access', description: 'Set up entry zones and QR check-in.', icon: 'qr_code_2', path: '/operations/access-control', optional: true },
];

export function setupStepHref(step: SetupStep, eventId: string) {
  return `/app/events/${eventId}${step.path}`;
}

/** Index of the step the page belongs to, or -1 for pages outside the path (including the workspace). */
export function setupStepIndex(pathname: string, eventId: string) {
  return SETUP_STEPS.findIndex((step) => {
    if (!step.path) return false;
    const href = setupStepHref(step, eventId);
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}

/** The first unfinished step, required or optional, or null once all are done. */
export function nextSetupStep(progress: SetupProgress) {
  return SETUP_STEPS.find((step) => !progress[step.id]) ?? null;
}

export function completedSetupSteps(progress: SetupProgress) {
  return SETUP_STEPS.filter((step) => progress[step.id]).length;
}

/** Required steps are done, so the event can go live. Optional steps can still be open. */
export function isReadyToGoLive(progress: SetupProgress) {
  return SETUP_STEPS.every((step) => step.optional || progress[step.id]);
}
