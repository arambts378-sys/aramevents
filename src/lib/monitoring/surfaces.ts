/**
 * Application surfaces that call the database. The recorder tags every call
 * with one of these, derived from the request pathname.
 */
export const METRIC_SOURCES = [
  'organizer',
  'public',
  'checkin',
  'auth',
  'admin',
  'jobs',
  'api',
  'marketing',
  'other',
] as const;

export type MetricSource = (typeof METRIC_SOURCES)[number];

export const SOURCE_LABELS: Record<MetricSource, { label: string; hint: string }> = {
  organizer: { label: 'Organizer dashboard', hint: '/app' },
  public: { label: 'Public event pages', hint: '/events' },
  checkin: { label: 'Check-in & scanners', hint: '/check-in, /volunteer' },
  auth: { label: 'Sign-in & sign-up', hint: '/login, /organizer' },
  admin: { label: 'Super admin console', hint: '/super-admin' },
  jobs: { label: 'Background jobs', hint: '/api/integrations' },
  api: { label: 'Other API routes', hint: '/api' },
  marketing: { label: 'Marketing site', hint: '/' },
  other: { label: 'Unattributed', hint: 'No request context' },
};

export function classifySurface(pathname: string): MetricSource {
  const p = pathname || '';
  if (!p) return 'other';
  if (p.startsWith('/super-admin')) return 'admin';
  if (p.startsWith('/api/integrations')) return 'jobs';
  if (
    p.startsWith('/check-in') ||
    p.startsWith('/volunteer') ||
    p.startsWith('/api/scanner-sessions') ||
    /^\/api\/events\/[^/]+\/(check-in|scanner-sessions)/.test(p) ||
    /^\/app\/events\/[^/]+\/(check-in|operations\/check-in)/.test(p)
  ) {
    return 'checkin';
  }
  if (p.startsWith('/app')) return 'organizer';
  if (p.startsWith('/events')) return 'public';
  if (
    p.startsWith('/login') ||
    p.startsWith('/signup') ||
    p.startsWith('/organizer') ||
    p.startsWith('/forgot-password') ||
    p.startsWith('/reset-password') ||
    p.startsWith('/invite') ||
    p.startsWith('/api/organizer') ||
    p.startsWith('/api/invitations')
  ) {
    return 'auth';
  }
  if (p.startsWith('/api')) return 'api';
  return 'marketing';
}
