import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { authorizedAdminClient } from '@/services/superAdminPortal.server';
import {
  DEFAULT_MONITORING_SETTINGS,
  type ConfigCheck,
  type DbCallMetrics,
  type DbHealth,
  type MonitoringResult,
  type MonitoringSettings,
  type PlatformAdminEntry,
  type PlatformSettingsData,
} from '@/lib/monitoring/types';

const MIGRATION = 'supabase/migrations/20261028000000_super_admin_live.sql';

function failure(error: { code?: string; message?: string }, what: string) {
  // PGRST202: function not found in schema cache; 42883: undefined function
  if (error.code === 'PGRST202' || error.code === '42883' || error.code === 'PGRST205') {
    return {
      ok: false as const,
      reason: 'not_installed' as const,
      message: `Apply ${MIGRATION} to enable ${what}.`,
    };
  }
  if (error.code === '42501') {
    return { ok: false as const, reason: 'error' as const, message: `Your role can't view ${what}.` };
  }
  console.error(`Failed to load ${what}:`, error);
  return { ok: false as const, reason: 'error' as const, message: `${what[0].toUpperCase()}${what.slice(1)} could not be loaded.` };
}

export async function getDbCallMetrics(windowMinutes: number): Promise<MonitoringResult<DbCallMetrics>> {
  try {
    const { supabase } = await authorizedAdminClient('monitoring.read');
    const { data, error } = await supabase.rpc('get_platform_db_call_metrics', {
      p_window_minutes: windowMinutes,
    });
    if (error) return failure(error, 'database call metrics');
    return { ok: true, data: data as DbCallMetrics };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getDbCallMetrics:', err);
    return { ok: false, reason: 'error', message: 'Database call metrics could not be loaded.' };
  }
}

export async function getDbHealth(): Promise<MonitoringResult<DbHealth>> {
  try {
    const { supabase } = await authorizedAdminClient('monitoring.read');
    const { data, error } = await supabase.rpc('get_platform_db_health');
    if (error) return failure(error, 'database health');
    return { ok: true, data: data as DbHealth };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getDbHealth:', err);
    return { ok: false, reason: 'error', message: 'Database health could not be loaded.' };
  }
}

export async function getPlatformSettings(): Promise<MonitoringResult<PlatformSettingsData>> {
  try {
    const { supabase } = await authorizedAdminClient('console.view');
    const { data, error } = await supabase.rpc('get_platform_settings');
    if (error) return failure(error, 'platform settings');
    const raw = (data || {}) as Partial<PlatformSettingsData>;
    return {
      ok: true,
      data: {
        monitoring: { ...DEFAULT_MONITORING_SETTINGS, ...(raw.monitoring || {}) },
        monitoringUpdatedAt: raw.monitoringUpdatedAt ?? null,
        monitoringUpdatedBy: raw.monitoringUpdatedBy ?? null,
        canManage: raw.canManage === true,
      },
    };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in getPlatformSettings:', err);
    return { ok: false, reason: 'error', message: 'Platform settings could not be loaded.' };
  }
}

export async function listPlatformAdmins(): Promise<MonitoringResult<PlatformAdminEntry[]>> {
  try {
    const { supabase } = await authorizedAdminClient('console.view');
    const { data, error } = await supabase.rpc('list_platform_admins');
    if (error) return failure(error, 'the admin team');
    return { ok: true, data: (data || []) as PlatformAdminEntry[] };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in listPlatformAdmins:', err);
    return { ok: false, reason: 'error', message: 'The admin team could not be loaded.' };
  }
}

export async function updateMonitoringSettings(
  input: MonitoringSettings,
): Promise<{ ok: true; data: MonitoringSettings } | { ok: false; message: string }> {
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
  if (![input.sampleRate, input.slowCallMs, input.retentionDays, input.errorRateAlertPct].every(Number.isFinite)) {
    return { ok: false, message: 'Every field needs a number.' };
  }

  try {
    const { supabase } = await authorizedAdminClient('settings.manage');
    const { data, error } = await supabase.rpc('update_platform_monitoring_settings', {
      p_capture_enabled: Boolean(input.captureEnabled),
      p_sample_rate: clamp(input.sampleRate, 1, 100),
      p_slow_call_ms: clamp(input.slowCallMs, 50, 30000),
      p_retention_days: clamp(input.retentionDays, 1, 90),
      p_error_rate_alert_pct: clamp(input.errorRateAlertPct, 1, 100),
    });
    if (error) {
      const f = failure(error, 'monitoring settings');
      return { ok: false, message: f.message };
    }
    return { ok: true, data: data as MonitoringSettings };
  } catch (err) {
    unstable_rethrow(err);
    console.error('Error in updateMonitoringSettings:', err);
    return { ok: false, message: 'Monitoring settings could not be saved.' };
  }
}

/** Reports which server secrets are present. Never returns the values. */
export function getConfigChecks(): ConfigCheck[] {
  const has = (...names: string[]) => names.some((n) => Boolean(process.env[n]?.trim()));
  return [
    {
      id: 'supabase',
      label: 'Database connection',
      detail: 'Supabase URL and publishable key',
      configured: has('NEXT_PUBLIC_SUPABASE_URL') && has('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      required: true,
    },
    {
      id: 'service-role',
      label: 'Service role key',
      detail: 'Background jobs, QR generation and call metrics',
      configured: has('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'),
      required: true,
    },
    {
      id: 'encryption',
      label: 'Encryption key',
      detail: 'Encrypts stored integration credentials',
      configured: has('ENCRYPTION_KEY') && !/^0+$/.test(process.env.ENCRYPTION_KEY || ''),
      required: true,
    },
    {
      id: 'qr',
      label: 'QR signing secret',
      detail: 'Signs attendee ticket QR codes',
      configured: has('QR_SIGNING_SECRET') && !/^0+$/.test(process.env.QR_SIGNING_SECRET || ''),
      required: true,
    },
    {
      id: 'smtp',
      label: 'Platform email',
      detail: 'Sends team invitations and contact-form emails',
      configured: has('PLATFORM_SMTP_HOST') && has('PLATFORM_SMTP_PASS'),
      required: true,
    },
    {
      id: 'cron',
      label: 'Cron secret',
      detail: 'Authorizes the integration job processor',
      configured: has('INTERNAL_CRON_SECRET'),
      required: false,
    },
    {
      id: 'app-url',
      label: 'App base URL',
      detail: 'Used in emails and ticket links',
      configured: has('NEXT_PUBLIC_APP_URL'),
      required: false,
    },
  ];
}
