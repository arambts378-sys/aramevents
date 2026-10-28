import type { TargetKind } from './dbCallRecorder';

export type { TargetKind };

export interface CallTotals {
  calls: number;
  errors: number;
  slow: number;
  total_ms: number;
  max_ms: number;
}

export interface CallTimelinePoint {
  t: string;
  calls: number;
  errors: number;
  slow: number;
}

export interface CallFlow {
  source: string;
  targetKind: TargetKind;
  target: string;
  calls: number;
  errors: number;
  slow: number;
  totalMs: number;
  maxMs: number;
}

export interface CallTarget {
  targetKind: TargetKind;
  target: string;
  calls: number;
  errors: number;
  slow: number;
  totalMs: number;
  maxMs: number;
  sources: number;
}

export interface DbCallMetrics {
  windowMinutes: number;
  stepMinutes: number;
  since: string;
  lastRecordedAt: string | null;
  totals: CallTotals;
  timeline: CallTimelinePoint[];
  flows: CallFlow[];
  targets: CallTarget[];
  methods: Array<{ method: string; calls: number }>;
}

export interface DbConnectionGroup {
  application: string;
  total: number;
  active: number;
  idle: number;
  idleInTransaction: number;
  longestActiveSec: number;
}

export interface DbTableStat {
  name: string;
  liveRows: number;
  deadRows: number;
  sizeBytes: number;
  seqScans: number;
  indexScans: number;
  inserts: number;
  updates: number;
  deletes: number;
  lastVacuum: string | null;
}

export interface DbStatement {
  query: string;
  calls: number;
  totalMs: number;
  meanMs: number;
  rows: number;
}

export interface DbHealth {
  collectedAt: string;
  databaseSizeBytes: number;
  serverVersion: string;
  maxConnections: number;
  statsResetAt: string | null;
  database: {
    commits: number;
    rollbacks: number;
    deadlocks: number;
    tempBytes: number;
    rowsReturned: number;
    rowsFetched: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsDeleted: number;
    cacheHitPct: number | null;
  };
  connections: DbConnectionGroup[];
  tables: DbTableStat[];
  statements: DbStatement[] | null;
}

export interface MonitoringSettings {
  captureEnabled: boolean;
  sampleRate: number;
  slowCallMs: number;
  retentionDays: number;
  errorRateAlertPct: number;
}

export const DEFAULT_MONITORING_SETTINGS: MonitoringSettings = {
  captureEnabled: true,
  sampleRate: 100,
  slowCallMs: 500,
  retentionDays: 14,
  errorRateAlertPct: 5,
};

export interface PlatformSettingsData {
  monitoring: MonitoringSettings;
  monitoringUpdatedAt: string | null;
  monitoringUpdatedBy: string | null;
  canManage: boolean;
}

export interface PlatformAdminEntry {
  userId: string;
  email: string | null;
  role: string;
  isActive: boolean;
  grantedAt: string;
  lastSignInAt: string | null;
}

export interface ConfigCheck {
  id: string;
  label: string;
  detail: string;
  configured: boolean;
  required: boolean;
}

/** A failed lookup that most likely means the monitoring migration isn't applied. */
export type MonitoringResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not_installed' | 'error'; message: string };
