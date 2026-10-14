/**
 * Unit tests for plan/entitlement resolution. Uses built-in node:test (no dependencies).
 * Run: npm run test:plans
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlanDefinitions,
  getPlanDefinition,
  resolvePlanId,
  resolveSubscription,
  resolveEntitlements,
  resolveWorkspacePlan,
  validateEntitlementOverrides,
  isInGoodStanding,
  loadWorkspacePlan,
  formatPlanPrice,
  getPlanCta,
  getSubscriptionStatusLabel,
  type PlanLookupDeps,
} from '../planService';
import { PLAN_DEFINITIONS } from '../../config/plans';
import type { WorkspaceSubscriptionRow } from '../../types/subscription';

const WS = '11111111-1111-4111-8111-111111111111';
const OTHER_WS = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-13T00:00:00Z');

function row(partial: Partial<WorkspaceSubscriptionRow> = {}): WorkspaceSubscriptionRow {
  return {
    workspace_id: WS,
    plan_id: 'professional',
    status: 'active',
    billing_interval: 'month',
    current_period_start: '2026-10-01T00:00:00Z',
    current_period_end: '2026-11-01T00:00:00Z',
    trial_ends_at: null,
    cancel_at_period_end: false,
    entitlement_overrides: {},
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...partial,
  };
}

describe('1. plan definitions', () => {
  test('three plans with stable identifiers in order', () => {
    assert.deepEqual(getPlanDefinitions().map((p) => p.id), ['free', 'professional', 'enterprise']);
  });
  test('free: ₹0, 2 active events, branding required', () => {
    const p = PLAN_DEFINITIONS.free;
    assert.equal(formatPlanPrice(p), '₹0');
    assert.equal(p.entitlements.maxActiveEvents, 2);
    assert.equal(p.entitlements.brandingRemovable, false);
    assert.equal(p.isPaid, false);
  });
  test('professional: proposed ₹1,999/month, 10 active events', () => {
    const p = PLAN_DEFINITIONS.professional;
    assert.equal(formatPlanPrice(p), '₹1,999/month');
    assert.ok(p.price.kind === 'fixed' && p.price.proposed);
    assert.equal(p.entitlements.maxActiveEvents, 10);
    assert.equal(p.entitlements.brandingRemovable, true);
  });
  test('enterprise: custom pricing, overrides allowed', () => {
    const p = PLAN_DEFINITIONS.enterprise;
    assert.equal(formatPlanPrice(p), 'Custom pricing');
    assert.equal(p.allowsOverrides, true);
  });
});

describe('2. unknown plan identifiers', () => {
  for (const bad of ['platinum', '', 'FREE', null, undefined, 42, {}, '__proto__']) {
    test(`resolves ${JSON.stringify(bad)} to free`, () => {
      assert.equal(resolvePlanId(bad), 'free');
      assert.equal(getPlanDefinition(bad).id, 'free');
    });
  }
  test('row with unknown plan grants free entitlements and warns', () => {
    const r = resolveWorkspacePlan(WS, row({ plan_id: 'platinum' }), NOW);
    assert.equal(r.effectivePlanId, 'free');
    assert.ok(r.warnings.length > 0);
  });
  test('unknown status is treated as not in good standing', () => {
    const r = resolveWorkspacePlan(WS, row({ status: 'hacked' }), NOW);
    assert.equal(r.subscription.status, 'incomplete');
    assert.equal(r.effectivePlanId, 'free');
  });
});

describe('3. workspaces without a subscription row', () => {
  test('resolve to synthetic Free default', () => {
    const r = resolveWorkspacePlan(WS, null, NOW);
    assert.equal(r.assignedPlan.id, 'free');
    assert.equal(r.subscription.isDefault, true);
    assert.equal(r.subscription.status, 'active');
    assert.deepEqual(r.entitlements, PLAN_DEFINITIONS.free.entitlements);
  });
  test('resolveSubscription(undefined) is default', () => {
    assert.equal(resolveSubscription(undefined).isDefault, true);
  });
});

describe('lifecycle vs entitlements', () => {
  test('active professional within period → professional entitlements', () => {
    const r = resolveWorkspacePlan(WS, row(), NOW);
    assert.equal(r.effectivePlanId, 'professional');
    assert.equal(r.inGoodStanding, true);
  });
  for (const status of ['past_due', 'canceled', 'incomplete']) {
    test(`${status} professional → free entitlements, assigned plan preserved`, () => {
      const r = resolveWorkspacePlan(WS, row({ status }), NOW);
      assert.equal(r.assignedPlan.id, 'professional');
      assert.equal(r.effectivePlanId, 'free');
      assert.deepEqual(r.entitlements, PLAN_DEFINITIONS.free.entitlements);
    });
  }
  test('active but period ended → free', () => {
    assert.equal(resolveWorkspacePlan(WS, row({ current_period_end: '2026-10-01T00:00:00Z' }), NOW).effectivePlanId, 'free');
  });
  test('trialing with future trial end → good standing; expired trial → free', () => {
    assert.equal(isInGoodStanding(resolveSubscription(row({ status: 'trialing', trial_ends_at: '2026-10-20T00:00:00Z' })), NOW), true);
    assert.equal(isInGoodStanding(resolveSubscription(row({ status: 'trialing', trial_ends_at: '2026-10-01T00:00:00Z' })), NOW), false);
  });
  test('free plan is always in good standing', () => {
    assert.equal(isInGoodStanding(resolveSubscription(row({ plan_id: 'free', status: 'canceled' })), NOW), true);
  });
  test('cancel_at_period_end keeps access until period end', () => {
    const r = resolveWorkspacePlan(WS, row({ cancel_at_period_end: true }), NOW);
    assert.equal(r.effectivePlanId, 'professional');
    assert.equal(r.subscription.cancelAtPeriodEnd, true);
  });
});

describe('enterprise overrides', () => {
  test('valid overrides merge onto enterprise defaults', () => {
    const r = resolveWorkspacePlan(WS, row({ plan_id: 'enterprise', entitlement_overrides: { maxActiveEvents: 200, maxTeamMembers: null } }), NOW);
    assert.equal(r.entitlements.maxActiveEvents, 200);
    assert.equal(r.entitlements.maxTeamMembers, null);
    assert.equal(r.entitlements.customDomain, true);
  });
  test('unknown keys rejected', () => {
    const v = validateEntitlementOverrides({ maxActiveEvents: 5, isAdmin: true });
    assert.equal(v.valid, false);
  });
  test('invalid values rejected', () => {
    for (const bad of [{ maxActiveEvents: -1 }, { maxActiveEvents: 1.5 }, { maxActiveEvents: '9' }, { analytics: 'ultra' }, { customDomain: 'yes' }]) {
      assert.equal(validateEntitlementOverrides(bad).valid, false, JSON.stringify(bad));
    }
  });
  test('non-object overrides rejected', () => {
    assert.equal(validateEntitlementOverrides([1]).valid, false);
    assert.equal(validateEntitlementOverrides('x').valid, false);
  });
  test('any invalid key → all overrides ignored (fail safe)', () => {
    const { entitlements, warnings } = resolveEntitlements('enterprise', { maxActiveEvents: 999, bogus: 1 });
    assert.equal(entitlements.maxActiveEvents, PLAN_DEFINITIONS.enterprise.entitlements.maxActiveEvents);
    assert.ok(warnings.length > 0);
  });
  test('overrides ignored on non-enterprise plans', () => {
    const { entitlements } = resolveEntitlements('professional', { maxActiveEvents: 999 });
    assert.equal(entitlements.maxActiveEvents, 10);
  });
  test('overrides not applied when enterprise is past_due', () => {
    const r = resolveWorkspacePlan(WS, row({ plan_id: 'enterprise', status: 'past_due', entitlement_overrides: { maxActiveEvents: 999 } }), NOW);
    assert.equal(r.entitlements.maxActiveEvents, 2);
  });
  test('prototype pollution keys rejected', () => {
    const v = validateEntitlementOverrides(JSON.parse('{"__proto__": {"x": 1}}'));
    assert.equal(v.valid, false);
  });
});

describe('4/5. authorized lookup', () => {
  const USER = 'user-a';
  function deps(over: Partial<PlanLookupDeps> & { rows?: Record<string, WorkspaceSubscriptionRow> } = {}) {
    const calls: string[] = [];
    const d: PlanLookupDeps = {
      getAuthenticatedUserId: over.getAuthenticatedUserId ?? (async () => USER),
      isWorkspaceMember: over.isWorkspaceMember ?? (async (ws, u) => ws === WS && u === USER),
      fetchSubscription:
        over.fetchSubscription ??
        (async (ws) => {
          calls.push(ws);
          return over.rows?.[ws] ?? null;
        }),
    };
    return { d, calls };
  }

  test('unauthenticated users are rejected', async () => {
    const { d } = deps({ getAuthenticatedUserId: async () => null });
    const r = await loadWorkspacePlan(d, WS, NOW);
    assert.equal(r.ok, false);
    assert.ok(!r.ok && r.error.code === 'unauthenticated');
  });
  test('malformed workspace id rejected', async () => {
    const { d } = deps();
    const r = await loadWorkspacePlan(d, "'; drop table--", NOW);
    assert.ok(!r.ok && r.error.code === 'invalid_workspace');
  });
  test('non-member cannot read another workspace plan; subscription never fetched', async () => {
    const { d, calls } = deps({ rows: { [OTHER_WS]: row({ workspace_id: OTHER_WS, plan_id: 'enterprise' }) } });
    const r = await loadWorkspacePlan(d, OTHER_WS, NOW);
    assert.ok(!r.ok && r.error.code === 'forbidden');
    assert.deepEqual(calls, []);
  });
  test('member without row gets Free default', async () => {
    const { d } = deps();
    const r = await loadWorkspacePlan(d, WS, NOW);
    assert.ok(r.ok && r.data.assignedPlan.id === 'free' && r.data.subscription.isDefault);
  });
  test('client cannot influence plan: only the stored row decides', async () => {
    // The lookup API accepts no plan/status inputs; a member with no row stays Free.
    const { d } = deps();
    const r = await loadWorkspacePlan(d, WS, NOW);
    assert.ok(r.ok && r.data.effectivePlanId === 'free');
  });
  test('query errors surface as lookup_failed without leaking details', async () => {
    const { d } = deps({ fetchSubscription: async () => { throw new Error('postgres relation does not exist'); } });
    const r = await loadWorkspacePlan(d, WS, NOW);
    assert.ok(!r.ok && r.error.code === 'lookup_failed' && !/postgres/.test(r.error.message));
  });
});

describe('6. settings display helpers', () => {
  test('status labels', () => {
    assert.equal(getSubscriptionStatusLabel('active'), 'Active');
    assert.equal(getSubscriptionStatusLabel('past_due'), 'Payment past due');
  });
  test('CTAs: current plan marked, others disabled Coming soon', () => {
    assert.equal(getPlanCta('free', 'free').kind, 'current');
    const up = getPlanCta('professional', 'free');
    assert.ok(up.kind === 'unavailable' && up.label === 'Upgrade' && up.note === 'Coming soon');
    const ent = getPlanCta('enterprise', 'free');
    assert.ok(ent.kind === 'unavailable' && ent.label === 'Contact sales');
  });
});
