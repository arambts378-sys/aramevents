/**
 * Centralized plan & entitlement resolution (Phase 1).
 *
 * Pure, dependency-free functions so they can run on the server, in tests,
 * and (for display only) on the client. Authorization decisions must only use
 * `loadWorkspacePlan` with server-side dependencies (see src/app/actions/planActions.ts).
 */
import { DEFAULT_PLAN_ID, PLAN_DEFINITIONS, PLAN_ORDER } from '../config/plans';
import {
  BILLING_INTERVALS,
  PLAN_IDS,
  SUBSCRIPTION_STATUSES,
  type BillingInterval,
  type EntitlementOverrides,
  type Entitlements,
  type PlanDefinition,
  type PlanId,
  type PlanResult,
  type ResolvedWorkspacePlan,
  type SubscriptionState,
  type SubscriptionStatus,
  type WorkspaceSubscriptionRow,
} from '../types/subscription';

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export function getPlanDefinitions(): PlanDefinition[] {
  return PLAN_ORDER.map((id) => PLAN_DEFINITIONS[id]);
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}

/** Unknown / malformed identifiers resolve safely to Free. */
export function resolvePlanId(value: unknown): PlanId {
  return isPlanId(value) ? value : DEFAULT_PLAN_ID;
}

export function getPlanDefinition(value: unknown): PlanDefinition {
  return PLAN_DEFINITIONS[resolvePlanId(value)];
}

export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.price.kind === 'custom') return 'Custom pricing';
  const amount = plan.price.amountMinor / 100;
  if (amount === 0) return '₹0';
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
  const per = plan.price.interval === 'year' ? 'year' : plan.price.interval === 'month' ? 'month' : '';
  return per ? `₹${formatted}/${per}` : `₹${formatted}`;
}

// ---------------------------------------------------------------------------
// Entitlement override validation (explicit schema; unknown keys rejected)
// ---------------------------------------------------------------------------

type Validator = (v: unknown) => boolean;
const limit: Validator = (v) => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1_000_000_000);
const bool: Validator = (v) => typeof v === 'boolean';
const oneOf = (...opts: string[]): Validator => (v) => typeof v === 'string' && opts.includes(v);

const ENTITLEMENT_SCHEMA: Record<keyof Entitlements, Validator> = {
  maxActiveEvents: limit,
  websiteTemplates: oneOf('basic', 'standard', 'custom'),
  brandingRemovable: bool,
  customDomain: bool,
  analytics: oneOf('basic', 'advanced', 'organization'),
  dataExports: bool,
  teamAccess: oneOf('limited', 'collaboration', 'advanced'),
  maxTeamMembers: limit,
  customRoles: bool,
  integrations: bool,
  monthlyNotificationLimit: limit,
  supportLevel: oneOf('community', 'priority', 'dedicated'),
};

export type OverrideValidation =
  | { valid: true; overrides: EntitlementOverrides }
  | { valid: false; errors: string[] };

export function validateEntitlementOverrides(raw: unknown): OverrideValidation {
  if (raw === null || raw === undefined) return { valid: true, overrides: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Overrides must be a JSON object.'] };
  }
  const errors: string[] = [];
  const overrides: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const validator = (ENTITLEMENT_SCHEMA as Record<string, Validator | undefined>)[key];
    if (!validator || !Object.prototype.hasOwnProperty.call(ENTITLEMENT_SCHEMA, key)) {
      errors.push(`Unknown entitlement key: ${key}`);
    } else if (!validator(value)) {
      errors.push(`Invalid value for ${key}`);
    } else {
      overrides[key] = value;
    }
  }
  return errors.length ? { valid: false, errors } : { valid: true, overrides: overrides as EntitlementOverrides };
}

// ---------------------------------------------------------------------------
// Subscription lifecycle
// ---------------------------------------------------------------------------

function pick<T extends string>(allowed: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function defaultSubscription(): SubscriptionState {
  return {
    planId: DEFAULT_PLAN_ID,
    status: 'active',
    billingInterval: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    isDefault: true,
  };
}

/** Normalises a DB row. A missing row yields the Free default (no DB write). */
export function resolveSubscription(row: WorkspaceSubscriptionRow | null | undefined): SubscriptionState {
  if (!row) return defaultSubscription();
  return {
    planId: resolvePlanId(row.plan_id),
    // Unknown statuses are treated as 'incomplete' (not in good standing).
    status: pick<SubscriptionStatus>(SUBSCRIPTION_STATUSES, row.status) ?? 'incomplete',
    billingInterval: pick<BillingInterval>(BILLING_INTERVALS, row.billing_interval),
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    isDefault: false,
  };
}

/**
 * Policy: a paid plan's entitlements apply only while the subscription is in good standing.
 *  - active   → good standing, unless current_period_end has passed
 *  - trialing → good standing, unless trial_ends_at has passed
 *  - past_due, canceled, incomplete → NOT in good standing (Free entitlements apply)
 * The Free plan is always in good standing.
 */
export function isInGoodStanding(sub: SubscriptionState, now: Date = new Date()): boolean {
  if (!PLAN_DEFINITIONS[sub.planId].isPaid) return true;
  const passed = (iso: string | null) => iso !== null && !Number.isNaN(Date.parse(iso)) && Date.parse(iso) <= now.getTime();
  switch (sub.status) {
    case 'active':
      return !passed(sub.currentPeriodEnd);
    case 'trialing':
      return !passed(sub.trialEndsAt);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Entitlement resolution
// ---------------------------------------------------------------------------

export function resolveEntitlements(
  planId: PlanId,
  rawOverrides?: unknown,
): { entitlements: Entitlements; warnings: string[] } {
  const plan = PLAN_DEFINITIONS[planId];
  const base: Entitlements = { ...plan.entitlements };
  const warnings: string[] = [];
  if (rawOverrides === undefined || rawOverrides === null) return { entitlements: base, warnings };

  const isEmptyObject =
    typeof rawOverrides === 'object' && !Array.isArray(rawOverrides) && Object.keys(rawOverrides as object).length === 0;
  if (isEmptyObject) return { entitlements: base, warnings };

  if (!plan.allowsOverrides) {
    warnings.push(`Entitlement overrides are ignored for the ${plan.name} plan.`);
    return { entitlements: base, warnings };
  }
  const result = validateEntitlementOverrides(rawOverrides);
  if (!result.valid) {
    // Fail safe: ignore ALL overrides if any are invalid.
    warnings.push(...result.errors.map((e) => `Override ignored: ${e}`));
    return { entitlements: base, warnings };
  }
  return { entitlements: { ...base, ...result.overrides }, warnings };
}

export function resolveWorkspacePlan(
  workspaceId: string,
  row: WorkspaceSubscriptionRow | null | undefined,
  now: Date = new Date(),
): ResolvedWorkspacePlan {
  const subscription = resolveSubscription(row);
  const warnings: string[] = [];
  if (row && !isPlanId(row.plan_id)) warnings.push('Unknown plan identifier; falling back to Free.');

  const inGoodStanding = isInGoodStanding(subscription, now);
  const effectivePlanId: PlanId = inGoodStanding ? subscription.planId : DEFAULT_PLAN_ID;
  const resolved = resolveEntitlements(
    effectivePlanId,
    effectivePlanId === subscription.planId ? row?.entitlement_overrides : undefined,
  );
  warnings.push(...resolved.warnings);

  return {
    workspaceId,
    assignedPlan: PLAN_DEFINITIONS[subscription.planId],
    effectivePlanId,
    subscription,
    entitlements: resolved.entitlements,
    inGoodStanding,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Display helpers (presentation only — never used for authorization)
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
};

export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  return STATUS_LABELS[status];
}

export type PlanCta =
  | { kind: 'current'; label: 'Current plan' }
  | { kind: 'unavailable'; label: string; note: 'Coming soon' };

/** Phase 1: no checkout exists, so every non-current action is disabled ("Coming soon"). */
export function getPlanCta(planId: PlanId, currentPlanId: PlanId): PlanCta {
  if (planId === currentPlanId) return { kind: 'current', label: 'Current plan' };
  const label = planId === 'enterprise' ? 'Contact sales' : planId === 'free' ? 'Switch to Free' : 'Upgrade';
  return { kind: 'unavailable', label, note: 'Coming soon' };
}

// ---------------------------------------------------------------------------
// Authorized lookup (dependency-injected so it is testable and reusable server-side)
// ---------------------------------------------------------------------------

export interface PlanLookupDeps {
  /** Returns the authenticated user's id from the server session, or null. */
  getAuthenticatedUserId(): Promise<string | null>;
  /** Server-side membership check for (workspace, user). */
  isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean>;
  /** Fetches the subscription row (RLS-scoped). Must throw on query errors. */
  fetchSubscription(workspaceId: string): Promise<WorkspaceSubscriptionRow | null>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadWorkspacePlan(
  deps: PlanLookupDeps,
  workspaceId: unknown,
  now: Date = new Date(),
): Promise<PlanResult<ResolvedWorkspacePlan>> {
  const userId = await deps.getAuthenticatedUserId();
  if (!userId) return { ok: false, error: { code: 'unauthenticated', message: 'Please sign in to view your plan.' } };

  if (typeof workspaceId !== 'string' || !UUID_RE.test(workspaceId)) {
    return { ok: false, error: { code: 'invalid_workspace', message: 'Invalid workspace.' } };
  }

  try {
    // The workspace id is only a selector; access is decided by server-side membership.
    if (!(await deps.isWorkspaceMember(workspaceId, userId))) {
      return { ok: false, error: { code: 'forbidden', message: 'You do not have access to this workspace.' } };
    }
    const row = await deps.fetchSubscription(workspaceId);
    return { ok: true, data: resolveWorkspacePlan(workspaceId, row, now) };
  } catch {
    return { ok: false, error: { code: 'lookup_failed', message: 'Unable to load plan details. Please try again.' } };
  }
}
