/**
 * Public, per-event pricing shown on /pricing and used by the landing-page assistant.
 * Marketing copy only: workspace plan limits and billing live in src/config/plans.ts.
 */
export interface PublicPricingTier {
  id: string;
  name: string;
  /** Display price, e.g. "₹1,999" or "Custom pricing". */
  price: string;
  /** Shown after the price, e.g. "per event". Empty for Free and Enterprise. */
  priceNote: string;
  /** Who the plan is for. */
  audience: string;
  attendees: string;
  /** The plan this one builds on, shown as "Everything in …". */
  includesFrom?: string;
  features: string[];
  popular?: boolean;
  cta: { label: string; href: string };
}

export const PRICING_HEADLINE = 'Everything you need to run a successful event.';

export const PUBLIC_PRICING: readonly PublicPricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    priceNote: '',
    audience: 'For small and community events',
    attendees: 'Up to 100 attendees',
    features: [
      'Event registration page',
      'QR ticket generation',
      'Basic attendee management',
      'QR check-in',
      'Attendance report',
    ],
    cta: { label: 'Start free', href: '/organizer/register' },
  },
  {
    id: 'essential',
    name: 'Essential',
    price: '₹1,999',
    priceNote: 'per event',
    audience: 'For workshops and small conferences',
    attendees: 'Up to 250 attendees',
    includesFrom: 'Free',
    features: [
      'Customisable event website',
      'Multiple ticket categories',
      'Registration management',
      'Attendee exports',
      'Custom registration fields',
    ],
    cta: { label: 'Get started', href: '/organizer/register' },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹4,999',
    priceNote: 'per event',
    audience: 'For conferences and institutional events',
    attendees: 'Up to 1,000 attendees',
    includesFrom: 'Essential',
    features: [
      'Advanced event website builder',
      'Speaker and sponsor profiles',
      'Agenda and session management',
      'Team management',
      'Event zones and access management',
      'Attendance analytics',
      'Digital certificates',
    ],
    popular: true,
    cta: { label: 'Get started', href: '/organizer/register' },
  },
  {
    id: 'business',
    name: 'Business',
    price: '₹12,999',
    priceNote: 'per event',
    audience: 'For large conferences and corporate events',
    attendees: 'Up to 5,000 attendees',
    includesFrom: 'Professional',
    features: [
      'Multi-gate check-in',
      'Advanced access control',
      'Volunteer management',
      'Advanced analytics and reports',
      'Third-party integrations',
      'Priority technical support',
    ],
    cta: { label: 'Get started', href: '/organizer/register' },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom pricing',
    priceNote: '',
    audience: 'For large-scale and multi-event programmes',
    attendees: 'More than 5,000 attendees or multiple events',
    features: [
      'Custom integrations',
      'White-label platform options',
      'Dedicated onboarding',
      'Custom reporting and workflows',
      'SLA-based support options',
      'Dedicated operational support',
    ],
    cta: { label: 'Contact sales', href: '/contact' },
  },
];

export const ADDITIONAL_SERVICES =
  'SMS and WhatsApp notifications, payment gateway charges, on-site event staff, badge printing, custom development and travel expenses are charged separately where applicable.';

export const GST_NOTE = 'All prices are exclusive of applicable GST.';

/** One-line description of a plan, for the assistant's answers. */
export function describeTier(t: PublicPricingTier): string {
  // Lower-case a feature's first letter mid-sentence, but leave acronyms such as "QR" or "SLA" alone.
  const low = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  // Always read mid-sentence ("It includes …", "Includes …"), so every feature is lower-cased.
  const list = t.features.map(low);
  const joined = `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
  return t.includesFrom ? `everything in ${t.includesFrom}, plus ${joined}.` : `${joined}.`;
}
