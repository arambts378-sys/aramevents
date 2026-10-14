import type { PlanDefinition, PlanId } from '../types/subscription';

/**
 * Single source of truth for ARAM BTS plan definitions.
 *
 * All prices, limits and entitlements are PROPOSALS and may change before launch.
 * Prices are intentionally NOT stored in the database.
 * Enterprise limits below are defaults; per-workspace values come from validated
 * `entitlement_overrides` on public.workspace_subscriptions.
 */
export const PLAN_DEFINITIONS: Readonly<Record<PlanId, PlanDefinition>> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need to run your first events.',
    price: { kind: 'fixed', amountMinor: 0, currency: 'INR', interval: 'month', proposed: false },
    features: [
      'Up to 2 active events',
      'Basic website templates',
      'ARAM BTS branding included',
      'Basic registration & attendee management',
      'QR tickets & basic check-in',
      'Basic analytics',
      'Limited team access',
    ],
    entitlements: {
      maxActiveEvents: 2,
      websiteTemplates: 'basic',
      brandingRemovable: false,
      customDomain: false,
      analytics: 'basic',
      dataExports: false,
      teamAccess: 'limited',
      maxTeamMembers: 3,
      customRoles: false,
      integrations: false,
      monthlyNotificationLimit: 500,
      supportLevel: 'community',
    },
    allowsOverrides: false,
    isPaid: false,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    tagline: 'For growing teams running events regularly.',
    price: { kind: 'fixed', amountMinor: 199900, currency: 'INR', interval: 'month', proposed: true },
    features: [
      'Up to 10 active events',
      'All standard website templates',
      'Option to remove ARAM BTS branding',
      'Advanced analytics & exports',
      'Team collaboration',
      'Higher notification allowances',
      'Priority support',
    ],
    entitlements: {
      maxActiveEvents: 10,
      websiteTemplates: 'standard',
      brandingRemovable: true,
      customDomain: false,
      analytics: 'advanced',
      dataExports: true,
      teamAccess: 'collaboration',
      maxTeamMembers: 15,
      customRoles: false,
      integrations: false,
      monthlyNotificationLimit: 10000,
      supportLevel: 'priority',
    },
    allowsOverrides: false,
    isPaid: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For organizations with custom requirements.',
    price: { kind: 'custom' },
    features: [
      'Configurable event & usage limits',
      'Custom branding & domain options',
      'Advanced access control',
      'Organization-wide analytics',
      'Custom roles & integrations',
      'Dedicated support',
    ],
    entitlements: {
      maxActiveEvents: 50,
      websiteTemplates: 'custom',
      brandingRemovable: true,
      customDomain: true,
      analytics: 'organization',
      dataExports: true,
      teamAccess: 'advanced',
      maxTeamMembers: null,
      customRoles: true,
      integrations: true,
      monthlyNotificationLimit: 100000,
      supportLevel: 'dedicated',
    },
    allowsOverrides: true,
    isPaid: true,
  },
};

export const DEFAULT_PLAN_ID: PlanId = 'free';

/** Display order for plan listings. */
export const PLAN_ORDER: readonly PlanId[] = ['free', 'professional', 'enterprise'];
