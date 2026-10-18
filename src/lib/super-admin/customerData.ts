import type { Json } from '@/types/supabase';

export interface CustomerDirectoryItem {
  id: string;
  name: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  eventCount: number;
  createdAt: string;
  planId: string;
  subscriptionStatus: string | null;
  billingInterval: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  hasSubscription: boolean;
}

export interface CustomerDirectoryData {
  items: CustomerDirectoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: {
    organizationCount: number;
    activeSubscriptionCount: number;
    eventCount: number;
  };
}

export interface CustomerDetailData {
  organization: CustomerDirectoryItem & {
    currentPeriodStart: string | null;
    trialEndsAt: string | null;
    entitlementOverrides: Record<string, Json | undefined> | null;
  };
  members: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    role: string | null;
    joinedAt: string;
  }>;
  membersTotal: number;
  memberPage: number;
  events: Array<{
    id: string;
    name: string;
    startDate: string;
    status: string;
    createdAt: string;
  }>;
  eventsTotal: number;
  eventPage: number;
  pageSize: number;
}

export type CustomerDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function isObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: Json | undefined): value is string | null {
  return value === null || typeof value === 'string';
}

function isCount(value: Json | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function parseCustomerDirectoryData(value: Json): CustomerDirectoryData | null {
  if (!isObject(value)) return null;
  const { items, totalCount, page, pageSize, summary } = value;
  if (!Array.isArray(items) || !isCount(totalCount) || !isCount(page) || !isCount(pageSize) || !isObject(summary)) return null;
  const parsedItems: CustomerDirectoryItem[] = [];

  for (const rawItem of items) {
    if (!rawItem || !isObject(rawItem)) return null;
    const item = rawItem;
    if (
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      !isStringOrNull(item.ownerId) ||
      !isStringOrNull(item.ownerName) ||
      !isStringOrNull(item.ownerEmail) ||
      !isCount(item.memberCount) ||
      !isCount(item.eventCount) ||
      typeof item.createdAt !== 'string' ||
      typeof item.planId !== 'string' ||
      !isStringOrNull(item.subscriptionStatus) ||
      !isStringOrNull(item.billingInterval) ||
      !isStringOrNull(item.currentPeriodEnd) ||
      typeof item.hasSubscription !== 'boolean'
    ) return null;

    parsedItems.push({
      id: item.id,
      name: item.name,
      ownerId: item.ownerId,
      ownerName: item.ownerName,
      ownerEmail: item.ownerEmail,
      memberCount: item.memberCount,
      eventCount: item.eventCount,
      createdAt: item.createdAt,
      planId: item.planId,
      subscriptionStatus: item.subscriptionStatus,
      billingInterval: item.billingInterval,
      currentPeriodEnd: item.currentPeriodEnd,
      cancelAtPeriodEnd: typeof item.cancelAtPeriodEnd === 'boolean' ? item.cancelAtPeriodEnd : null,
      hasSubscription: item.hasSubscription,
    });
  }

  if (!isCount(summary.organizationCount) || !isCount(summary.activeSubscriptionCount) || !isCount(summary.eventCount)) return null;
  return {
    items: parsedItems,
    totalCount,
    page,
    pageSize,
    summary: {
      organizationCount: summary.organizationCount,
      activeSubscriptionCount: summary.activeSubscriptionCount,
      eventCount: summary.eventCount,
    },
  };
}

export function parseCustomerDetailData(value: Json): CustomerDetailData | null {
  if (!isObject(value) || !isObject(value.organization) || !Array.isArray(value.members) || !Array.isArray(value.events)) return null;
  const rawOrganization = value.organization;
  const directoryData = parseCustomerDirectoryData({
    items: [{
      ...rawOrganization,
      memberCount: rawOrganization.memberCount,
      eventCount: rawOrganization.eventCount,
    }],
    totalCount: 1,
    page: 1,
    pageSize: 1,
    summary: { organizationCount: 1, activeSubscriptionCount: 0, eventCount: 0 },
  });
  if (!directoryData) return null;

  const members: CustomerDetailData['members'] = [];
  for (const rawMember of value.members) {
    if (!rawMember || !isObject(rawMember) || typeof rawMember.userId !== 'string' || typeof rawMember.joinedAt !== 'string' || !isStringOrNull(rawMember.name) || !isStringOrNull(rawMember.email) || !isStringOrNull(rawMember.role)) return null;
    members.push({
      userId: rawMember.userId,
      name: rawMember.name,
      email: rawMember.email,
      role: rawMember.role,
      joinedAt: rawMember.joinedAt,
    });
  }

  const events: CustomerDetailData['events'] = [];
  for (const rawEvent of value.events) {
    if (!rawEvent || !isObject(rawEvent) || typeof rawEvent.id !== 'string' || typeof rawEvent.name !== 'string' || typeof rawEvent.startDate !== 'string' || typeof rawEvent.status !== 'string' || typeof rawEvent.createdAt !== 'string') return null;
    events.push({
      id: rawEvent.id,
      name: rawEvent.name,
      startDate: rawEvent.startDate,
      status: rawEvent.status,
      createdAt: rawEvent.createdAt,
    });
  }

  const overrides = rawOrganization.entitlementOverrides;
  if (overrides !== null && (!overrides || !isObject(overrides))) return null;
  if (
    !isCount(value.membersTotal) ||
    !isCount(value.memberPage) ||
    !isCount(value.eventsTotal) ||
    !isCount(value.eventPage) ||
    !isCount(value.pageSize) ||
    !isStringOrNull(rawOrganization.currentPeriodStart) ||
    !isStringOrNull(rawOrganization.trialEndsAt)
  ) return null;

  return {
    organization: {
      ...directoryData.items[0],
      currentPeriodStart: rawOrganization.currentPeriodStart,
      trialEndsAt: rawOrganization.trialEndsAt,
      entitlementOverrides: overrides === null ? null : overrides,
    },
    members,
    membersTotal: value.membersTotal,
    memberPage: value.memberPage,
    events,
    eventsTotal: value.eventsTotal,
    eventPage: value.eventPage,
    pageSize: value.pageSize,
  };
}
