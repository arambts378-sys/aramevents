import type { Json } from '@/types/supabase';

export interface PlatformActivityItem {
  id: string;
  occurredAt: string;
  workspaceId: string | null;
  actorUserId: string | null;
  category: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: 'success' | 'failure' | 'warning';
  severity: 'info' | 'warning' | 'error';
  errorCode: string | null;
  message: string;
  correlationId: string;
  metadata: Record<string, string>;
}

export interface PlatformActivityData {
  items: PlatformActivityItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: {
    recentCount: number;
    errorCount: number;
  };
}

export type ActivityDataResult =
  | { ok: true; data: PlatformActivityData }
  | { ok: false; message: string };

function isObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: Json | undefined): value is string | null {
  return value === null || typeof value === 'string';
}

function isCount(value: Json | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function parsePlatformActivityData(value: Json): PlatformActivityData | null {
  if (!isObject(value) || !Array.isArray(value.items) || !isObject(value.summary)) return null;
  if (
    !isCount(value.totalCount) ||
    !isCount(value.page) ||
    !isCount(value.pageSize) ||
    !isCount(value.summary.recentCount) ||
    !isCount(value.summary.errorCount)
  ) return null;

  const items: PlatformActivityItem[] = [];
  for (const raw of value.items) {
    if (
      !raw ||
      !isObject(raw) ||
      typeof raw.id !== 'string' ||
      typeof raw.occurredAt !== 'string' ||
      !isNullableString(raw.workspaceId) ||
      !isNullableString(raw.actorUserId) ||
      typeof raw.category !== 'string' ||
      typeof raw.action !== 'string' ||
      !isNullableString(raw.resourceType) ||
      !isNullableString(raw.resourceId) ||
      !['success', 'failure', 'warning'].includes(String(raw.outcome)) ||
      !['info', 'warning', 'error'].includes(String(raw.severity)) ||
      !isNullableString(raw.errorCode) ||
      typeof raw.message !== 'string' ||
      typeof raw.correlationId !== 'string' ||
      !isObject(raw.metadata)
    ) return null;

    const metadata: Record<string, string> = {};
    for (const [key, metadataValue] of Object.entries(raw.metadata)) {
      if (typeof metadataValue !== 'string') return null;
      metadata[key] = metadataValue;
    }
    items.push({
      id: raw.id,
      occurredAt: raw.occurredAt,
      workspaceId: raw.workspaceId,
      actorUserId: raw.actorUserId,
      category: raw.category,
      action: raw.action,
      resourceType: raw.resourceType,
      resourceId: raw.resourceId,
      outcome: raw.outcome as PlatformActivityItem['outcome'],
      severity: raw.severity as PlatformActivityItem['severity'],
      errorCode: raw.errorCode,
      message: raw.message,
      correlationId: raw.correlationId,
      metadata,
    });
  }

  return {
    items,
    totalCount: value.totalCount,
    page: value.page,
    pageSize: value.pageSize,
    summary: {
      recentCount: value.summary.recentCount,
      errorCount: value.summary.errorCount,
    },
  };
}
