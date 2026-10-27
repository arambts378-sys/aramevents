/**
 * Aram Events — Master Admin Portal Types
 */

export type PlatformRole =
  | 'super_admin'
  | 'support'
  | 'moderator'
  | 'platform_super_admin'
  | 'platform_support'
  | 'platform_moderator';

export interface PlatformAdminUser {
  id: string;
  email: string;
  role: PlatformRole;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
}

export interface PlatformOverviewSummary {
  totalWorkspaces: number;
  suspendedWorkspaces: number;
  totalOrganizers: number;
  totalEvents: number;
  draftEvents: number;
  publishedEvents: number;
  archivedEvents: number;
  liveEvents: number;
  moderatedEvents: number;
  totalRegistrations: number;
}

export interface RecentWorkspaceItem {
  id: string;
  name: string;
  slug: string;
  is_suspended: boolean;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
}

export interface RecentEventItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  moderation_status: string;
  start_date: string;
  created_at: string;
  workspace_name: string;
}

export interface RecentAuditItem {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  created_at: string;
  actor_email: string | null;
}

export interface PlatformOverviewData {
  summary: PlatformOverviewSummary;
  recentWorkspaces: RecentWorkspaceItem[];
  recentEvents: RecentEventItem[];
  recentAudits: RecentAuditItem[];
}

export interface PlatformOrganizerItem {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  eventCount: number;
  registrationCount: number;
  planId: string;
  subscriptionStatus: string | null;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

export interface PlatformOrganizerDirectoryData {
  items: PlatformOrganizerItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PlatformEventItem {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  type: string;
  format: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string | null;
  isModerated: boolean;
  moderationStatus: 'normal' | 'flagged' | 'suspended';
  moderationReason: string | null;
  createdAt: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIsSuspended: boolean;
  organizerName: string | null;
  organizerEmail: string | null;
  registrationCount: number;
}

export interface PlatformEventDirectoryData {
  items: PlatformEventItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export type EventModerationAction =
  | 'flag'
  | 'suspend'
  | 'unpublish'
  | 'archive'
  | 'restore';

export interface PlatformAuditLogItem {
  id: string;
  actorUserId: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformAuditLogDirectoryData {
  items: PlatformAuditLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PlatformAnalyticsData {
  workspacesGrowth: Array<{ month: string; count: number }>;
  eventsGrowth: Array<{ month: string; count: number }>;
  registrationsGrowth: Array<{ month: string; count: number }>;
  eventsByStatus: Array<{ status: string; count: number }>;
  eventsByType: Array<{ type: string; count: number }>;
  planDistribution: Array<{ plan: string; count: number }>;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string };
