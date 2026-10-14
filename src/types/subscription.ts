/**
 * Subscription & entitlement types (Phase 1).
 *
 * Three separate concepts are kept apart deliberately:
 *  1. PlanDefinition    – static, configurable product catalogue (src/config/plans.ts)
 *  2. Entitlements      – what a workspace may use (resolved, never trusted from client)
 *  3. SubscriptionState – lifecycle / payment status of a workspace's assignment
 */

export const PLAN_IDS = ['free', 'professional', 'enterprise'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_INTERVALS = ['month', 'year', 'custom'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export type WebsiteTemplateTier = 'basic' | 'standard' | 'custom';
export type AnalyticsTier = 'basic' | 'advanced' | 'organization';
export type SupportLevel = 'community' | 'priority' | 'dedicated';
export type TeamAccessTier = 'limited' | 'collaboration' | 'advanced';

/** `null` on a numeric limit means "unlimited". Not enforced in Phase 1. */
export interface Entitlements {
  maxActiveEvents: number | null;
  websiteTemplates: WebsiteTemplateTier;
  brandingRemovable: boolean;
  customDomain: boolean;
  analytics: AnalyticsTier;
  dataExports: boolean;
  teamAccess: TeamAccessTier;
  maxTeamMembers: number | null;
  customRoles: boolean;
  integrations: boolean;
  monthlyNotificationLimit: number | null;
  supportLevel: SupportLevel;
}

export type EntitlementOverrides = Partial<Entitlements>;

export type PlanPrice =
  | { kind: 'fixed'; amountMinor: number; currency: 'INR'; interval: BillingInterval; proposed: boolean }
  | { kind: 'custom' };

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  price: PlanPrice;
  features: string[];
  entitlements: Entitlements;
  /** Whether per-workspace entitlement overrides are honoured for this plan. */
  allowsOverrides: boolean;
  /** Paid plans only grant their entitlements while the subscription is in good standing. */
  isPaid: boolean;
}

/** Raw row shape of public.workspace_subscriptions (as returned by the Data API). */
export interface WorkspaceSubscriptionRow {
  workspace_id: string;
  plan_id: string;
  status: string;
  billing_interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  entitlement_overrides: unknown;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionState {
  planId: PlanId;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  /** true when no row exists and the Free default was synthesised (nothing written). */
  isDefault: boolean;
}

export interface ResolvedWorkspacePlan {
  workspaceId: string;
  /** The plan assigned to the workspace. */
  assignedPlan: PlanDefinition;
  /** The plan whose entitlements are actually in effect (Free if a paid plan is not in good standing). */
  effectivePlanId: PlanId;
  subscription: SubscriptionState;
  entitlements: Entitlements;
  /** Whether the subscription currently grants the assigned plan's entitlements. */
  inGoodStanding: boolean;
  warnings: string[];
}

export type PlanErrorCode = 'unauthenticated' | 'invalid_workspace' | 'forbidden' | 'lookup_failed';

export type PlanResult<T> = { ok: true; data: T } | { ok: false; error: { code: PlanErrorCode; message: string } };
