export function fmtDate(value: string | null | undefined, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? fallback : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}

export function fmtAgo(value: string | null | undefined, fallback = 'Never') {
  if (!value) return fallback;
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return fallback;
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return fmtDate(value, fallback);
}

export const ROLE_LABEL: Record<string, string> = {
  workspace_owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  member: 'Member',
  viewer: 'Viewer',
  super_admin: 'Super admin',
  platform_super_admin: 'Super admin',
  support: 'Support',
  platform_support: 'Support',
  moderator: 'Moderator',
  platform_moderator: 'Moderator',
};

export function roleLabel(role: string | null | undefined) {
  return role ? ROLE_LABEL[role] ?? role.replace(/_/g, ' ') : 'Member';
}

export function pageHref(base: string, params: Record<string, string | undefined>, page?: number) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== 'page') q.set(k, v);
  if (page && page > 1) q.set('page', String(page));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export const STATUS_PILL: Record<'active' | 'blocked' | 'unverified', { tone: 'success' | 'danger' | 'warning'; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  blocked: { tone: 'danger', label: 'Blocked' },
  unverified: { tone: 'warning', label: 'Email not verified' },
};
