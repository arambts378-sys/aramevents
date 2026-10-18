import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPageCount,
  isWorkspaceId,
  parseCustomerDirectoryQuery,
  parsePositivePage,
} from '../customerDirectory';
import { parseCustomerDetailData, parseCustomerDirectoryData } from '../customerData';

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';

function workspace(overrides: Record<string, unknown> = {}) {
  return {
    id: WORKSPACE_ID,
    name: 'Acme Events',
    ownerId: '00000000-0000-4000-8000-000000000002',
    ownerName: 'Asha Rao',
    ownerEmail: 'asha@example.test',
    memberCount: 1,
    eventCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    planId: 'free',
    subscriptionStatus: null,
    billingInterval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: null,
    hasSubscription: false,
    ...overrides,
  };
}

function detail(overrides: Record<string, unknown> = {}) {
  return {
    organization: {
      ...workspace({ ownerId: null, ownerName: null, ownerEmail: null }),
      currentPeriodStart: null,
      trialEndsAt: null,
      entitlementOverrides: null,
    },
    members: [
      {
        userId: '00000000-0000-4000-8000-000000000002',
        name: null,
        email: null,
        role: null,
        joinedAt: '2026-01-02T00:00:00Z',
      },
    ],
    membersTotal: 1,
    memberPage: 1,
    events: [],
    eventsTotal: 0,
    eventPage: 1,
    pageSize: 20,
    ...overrides,
  };
}

describe('customer directory query parsing', () => {
  test('search, plan filter, sort direction, and pagination are parsed', () => {
    assert.deepEqual(
      parseCustomerDirectoryQuery({
        q: '  Acme  ',
        plan: 'professional',
        sort: 'event_count',
        direction: 'asc',
        page: '3',
      }),
      {
        search: 'Acme',
        plan: 'professional',
        sort: 'event_count',
        direction: 'asc',
        page: 3,
      },
    );
  });

  test('invalid filters fall back safely and oversized search is bounded', () => {
    const parsed = parseCustomerDirectoryQuery({
      q: 'x'.repeat(300),
      plan: 'unrecognized',
      sort: 'arbitrary-column',
      direction: 'sideways',
      page: ['2', '9'],
    });
    assert.equal(parsed.search?.length, 120);
    assert.equal(parsed.plan, null);
    assert.equal(parsed.sort, 'created_at');
    assert.equal(parsed.direction, 'desc');
    assert.equal(parsed.page, 1);
  });

  test('invalid and excessively large pages remain bounded', () => {
    assert.equal(parsePositivePage('0'), 1);
    assert.equal(parsePositivePage('-1'), 1);
    assert.equal(parsePositivePage('invalid'), 1);
    assert.equal(parsePositivePage('100000'), 10000);
    assert.equal(getPageCount(41, 20), 3);
    assert.equal(getPageCount(0, 20), 1);
  });

  test('workspace IDs must be complete UUIDs', () => {
    assert.equal(isWorkspaceId(WORKSPACE_ID), true);
    assert.equal(isWorkspaceId('Acme Events'), false);
    assert.equal(isWorkspaceId(`${WORKSPACE_ID}extra`), false);
  });
});

describe('customer data shape handling', () => {
  test('directory preserves missing profile and subscription rows as explicit nullable/default values', () => {
    const result = parseCustomerDirectoryData({
      items: [workspace({ ownerId: null, ownerName: null, ownerEmail: null })],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      summary: { organizationCount: 1, activeSubscriptionCount: 0, eventCount: 0 },
    });
    assert.ok(result);
    assert.equal(result.items[0].ownerName, null);
    assert.equal(result.items[0].ownerEmail, null);
    assert.equal(result.items[0].planId, 'free');
    assert.equal(result.items[0].hasSubscription, false);
  });

  test('Customer 360 tolerates a missing owner profile and member profile', () => {
    const result = parseCustomerDetailData(detail());
    assert.ok(result);
    assert.equal(result.organization.ownerName, null);
    assert.equal(result.organization.hasSubscription, false);
    assert.equal(result.members[0].name, null);
    assert.equal(result.members[0].email, null);
    assert.equal(result.members[0].role, null);
    assert.deepEqual(result.events, []);
  });

  test('malformed database payloads are rejected rather than rendered', () => {
    assert.equal(parseCustomerDirectoryData({ items: [], totalCount: 'all' }), null);
    assert.equal(parseCustomerDetailData({ organization: {}, members: [], events: [] }), null);
  });
});
