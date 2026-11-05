/** Reasons offered in the "Leaving so soon?" survey. Ids are stored; labels are what visitors and admins see. */
export const EXIT_REASONS = [
  { id: 'just_browsing', label: 'Just looking around' },
  { id: 'pricing_unclear', label: 'Pricing isn’t clear' },
  { id: 'too_expensive', label: 'Too expensive for me' },
  { id: 'missing_feature', label: 'Missing a feature I need' },
  { id: 'hard_to_find', label: 'Couldn’t find what I need' },
  { id: 'come_back_later', label: 'I’ll come back later' },
  { id: 'other', label: 'Something else' },
] as const;

export type ExitReasonId = (typeof EXIT_REASONS)[number]['id'];

export const EXIT_COMMENT_MAX = 1000;

export const isExitReason = (v: unknown): v is ExitReasonId =>
  typeof v === 'string' && EXIT_REASONS.some((r) => r.id === v);

export const exitReasonLabel = (id: string) => EXIT_REASONS.find((r) => r.id === id)?.label ?? id;
