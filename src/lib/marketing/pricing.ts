/**
 * Public, per-event pricing shown on /pricing and used by the landing-page assistant.
 * Marketing copy only: workspace plan limits and billing live in src/config/plans.ts.
 */
export interface PublicPricingTier {
  id: string;
  name: string;
  /** Display price, e.g. "₹1,499" or "Custom". */
  price: string;
  /** Short line under the price. */
  basis: string;
  attendees: string;
  summary: string;
  recommended?: boolean;
  cta: { label: string; href: string };
}

export const PUBLIC_PRICING: readonly PublicPricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    basis: 'Small events',
    attendees: 'Up to 100 attendees',
    summary: 'Basic event page, registration, QR tickets, check-in and attendee management.',
    cta: { label: 'Start free', href: '/organizer/register' },
  },
  {
    id: 'essential',
    name: 'Essential',
    price: '₹1,499',
    basis: 'Per event',
    attendees: 'Up to 250 attendees',
    summary:
      'Event website, ticket categories, registration management, QR check-in and attendee exports.',
    cta: { label: 'Get started', href: '/organizer/register' },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹3,999',
    basis: 'Per event',
    attendees: 'Up to 1,000 attendees',
    summary:
      'Advanced website builder, speakers, sponsors, agenda, team management, event zones, analytics and certificates.',
    recommended: true,
    cta: { label: 'Get started', href: '/organizer/register' },
  },
  {
    id: 'business',
    name: 'Business',
    price: '₹9,999',
    basis: 'Per event',
    attendees: 'Up to 5,000 attendees',
    summary:
      'Advanced access control, multiple gates, volunteer management, advanced analytics, integrations and priority support.',
    cta: { label: 'Get started', href: '/organizer/register' },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    basis: 'Above 5,000 attendees or multiple-event programs',
    attendees: '5,000+ attendees',
    summary:
      'Custom integrations, white-label options, dedicated onboarding, SLA and operational support.',
    cta: { label: 'Contact sales', href: '/contact' },
  },
];
