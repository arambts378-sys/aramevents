import 'server-only';
import { cache } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { createClient as createSupabaseClient, type User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorizedAdminClient } from '@/services/superAdminPortal.server';

/**
 * Live data for the Super Admin console.
 *
 * Every export first runs `authorizedAdminClient(permission)`, which verifies
 * the signed-in user's platform permission through `has_platform_permission`.
 * Only after that check does it use the service-role client, so the console
 * can read across every workspace without depending on per-feature RPCs.
 */

export type Result<T> = { ok: true; data: T } | { ok: false; message: string };

const SETUP_SQL = 'supabase/migrations/20261028000000_super_admin_live.sql';
const DAY = 86_400_000;

type Db = ReturnType<typeof createAdminClient>;

async function context(permission: string) {
  const { supabase, user } = await authorizedAdminClient(permission);
  return { db: createAdminClient(), actor: user, session: supabase };
}

function fail(err: unknown, message: string): { ok: false; message: string } {
  unstable_rethrow(err);
  console.error(message, err);
  return { ok: false, message };
}

function isMissingColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(error.message || '')));
}

function publicAuthClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function resetRedirect() {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  return base ? { redirectTo: `${base}/reset-password` } : undefined;
}

// ---------------------------------------------------------------------------
// Shared lookups (deduplicated per request)
// ---------------------------------------------------------------------------

export interface AccountInfo {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
}

function toAccount(u: User & { banned_until?: string | null }): AccountInfo {
  return {
    id: u.id,
    email: u.email ?? null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    emailConfirmedAt: u.email_confirmed_at ?? null,
    bannedUntil: u.banned_until ?? null,
  };
}

export function isBlocked(a: Pick<AccountInfo, 'bannedUntil'>) {
  return Boolean(a.bannedUntil && new Date(a.bannedUntil).getTime() > Date.now());
}

const listAccounts = cache(async (): Promise<AccountInfo[]> => {
  const db = createAdminClient();
  const out: AccountInfo[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users.map((u) => toAccount(u as User & { banned_until?: string | null })));
    if (data.users.length < 1000) break;
  }
  return out;
});

const loadDirectory = cache(async () => {
  const db = createAdminClient();
  const [workspaces, members, roles, profiles, events, platformRoles] = await Promise.all([
    db.from('workspaces').select('*').order('created_at', { ascending: false }),
    db.from('workspace_members').select('workspace_id, user_id, role_id, created_at'),
    db.from('roles').select('id, name'),
    db.from('profiles').select('id, full_name'),
    db.from('events').select('id, workspace_id, name, slug, status, type, start_date, end_date, location, created_at, created_by'),
    db.from('platform_roles').select('user_id, role, is_active, created_at'),
  ]);
  for (const r of [workspaces, members, roles, profiles, events]) if (r.error) throw r.error;

  return {
    workspaces: (workspaces.data || []) as Array<{
      id: string; name: string; slug: string; owner_id: string | null; created_at: string; email?: string | null;
      is_suspended?: boolean; suspended_reason?: string | null; suspended_at?: string | null;
    }>,
    members: (members.data || []) as Array<{ workspace_id: string; user_id: string; role_id: string | null; created_at: string }>,
    roleNames: new Map((roles.data || []).map((r: { id: string; name: string }) => [r.id, r.name])),
    roles: (roles.data || []) as Array<{ id: string; name: string }>,
    names: new Map((profiles.data || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name])),
    events: (events.data || []) as Array<{
      id: string; workspace_id: string; name: string; slug: string; status: string; type: string | null;
      start_date: string | null; end_date: string | null; location: string | null; created_at: string; created_by: string | null;
    }>,
    platformRoles: (platformRoles.data || []) as Array<{ user_id: string; role: string; is_active: boolean; created_at: string }>,
  };
});

/** Registration and check-in counts per event, via head-only count queries. */
async function countsByEvent(db: Db, eventIds: string[]) {
  const regs = new Map<string, number>();
  const checkins = new Map<string, number>();
  for (let i = 0; i < eventIds.length; i += 20) {
    const batch = eventIds.slice(i, i + 20);
    await Promise.all(
      batch.flatMap((id) => [
        db.from('registrations').select('id', { count: 'exact', head: true }).eq('event_id', id)
          .then(({ count }) => regs.set(id, count ?? 0)),
        db.from('check_ins').select('id', { count: 'exact', head: true }).eq('event_id', id).eq('result', 'allowed')
          .then(({ count }) => checkins.set(id, count ?? 0)),
      ]),
    );
  }
  return { regs, checkins };
}

async function audit(
  db: Db,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  reason: string | null,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await db.from('platform_audit_logs').insert({
    actor_user_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    reason: reason?.slice(0, 2000) ?? null,
    metadata,
  });
  if (error) console.warn('Audit log write failed:', error.message);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface OverviewData {
  counts: {
    workspaces: number;
    suspendedWorkspaces: number | null;
    organizers: number;
    newOrganizers30d: number;
    unverified: number;
    blocked: number;
    events: number;
    published: number;
    drafts: number;
    upcoming: number;
    registrations: number;
    registrations7d: number;
    checkInsToday: number;
  };
  upcoming: Array<{ id: string; name: string; workspaceName: string; startDate: string | null; status: string; registrations: number }>;
  newestOrganizers: Array<{ id: string; email: string | null; name: string | null; workspaceName: string | null; createdAt: string; verified: boolean }>;
  recentAudits: Array<{ id: string; action: string; actorEmail: string | null; reason: string | null; createdAt: string }>;
}

export async function getOverview(): Promise<Result<OverviewData>> {
  try {
    const { db } = await context('console.view');
    const [dir, accounts] = await Promise.all([loadDirectory(), listAccounts()]);
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00.000Z`;

    const [regs, regs7d, checkIns, audits] = await Promise.all([
      db.from('registrations').select('id', { count: 'exact', head: true }),
      db.from('registrations').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * DAY).toISOString()),
      db.from('check_ins').select('id', { count: 'exact', head: true }).gte('scanned_at', startOfDay).eq('result', 'allowed'),
      db.from('platform_audit_logs').select('id, actor_user_id, action, reason, created_at').order('created_at', { ascending: false }).limit(6),
    ]);

    const adminIds = new Set(dir.platformRoles.map((r) => r.user_id));
    const organizers = accounts.filter((a) => !adminIds.has(a.id) || dir.members.some((m) => m.user_id === a.id));
    const emailOf = new Map(accounts.map((a) => [a.id, a.email]));
    const wsName = new Map(dir.workspaces.map((w) => [w.id, w.name]));
    const firstWorkspace = (userId: string) => {
      const m = dir.members.find((x) => x.user_id === userId);
      return m ? wsName.get(m.workspace_id) ?? null : dir.workspaces.find((w) => w.owner_id === userId)?.name ?? null;
    };

    const upcomingEvents = dir.events
      .filter((e) => e.start_date && e.start_date >= today && e.status !== 'archived')
      .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
    const shown = upcomingEvents.slice(0, 6);
    const { regs: regCounts } = await countsByEvent(db, shown.map((e) => e.id));

    const hasSuspension = dir.workspaces.length === 0 || 'is_suspended' in dir.workspaces[0];

    return {
      ok: true,
      data: {
        counts: {
          workspaces: dir.workspaces.length,
          suspendedWorkspaces: hasSuspension ? dir.workspaces.filter((w) => w.is_suspended).length : null,
          organizers: organizers.length,
          newOrganizers30d: organizers.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 30 * DAY).length,
          unverified: organizers.filter((a) => !a.emailConfirmedAt).length,
          blocked: organizers.filter(isBlocked).length,
          events: dir.events.length,
          published: dir.events.filter((e) => e.status === 'published').length,
          drafts: dir.events.filter((e) => e.status === 'draft').length,
          upcoming: upcomingEvents.length,
          registrations: regs.count ?? 0,
          registrations7d: regs7d.count ?? 0,
          checkInsToday: checkIns.count ?? 0,
        },
        upcoming: shown.map((e) => ({
          id: e.id,
          name: e.name,
          workspaceName: wsName.get(e.workspace_id) ?? 'Unknown workspace',
          startDate: e.start_date,
          status: e.status,
          registrations: regCounts.get(e.id) ?? 0,
        })),
        newestOrganizers: [...organizers]
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, 6)
          .map((a) => ({
            id: a.id,
            email: a.email,
            name: dir.names.get(a.id) ?? null,
            workspaceName: firstWorkspace(a.id),
            createdAt: a.createdAt,
            verified: Boolean(a.emailConfirmedAt),
          })),
        recentAudits: (audits.data || []).map((r: { id: string; actor_user_id: string; action: string; reason: string | null; created_at: string }) => ({
          id: r.id,
          action: r.action,
          actorEmail: emailOf.get(r.actor_user_id) ?? null,
          reason: r.reason,
          createdAt: r.created_at,
        })),
      },
    };
  } catch (err) {
    return fail(err, 'Platform overview could not be loaded.');
  }
}

// ---------------------------------------------------------------------------
// Organizer accounts
// ---------------------------------------------------------------------------

export type OrganizerStatus = 'active' | 'blocked' | 'unverified';

export interface OrganizerRow {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  status: OrganizerStatus;
  isPlatformAdmin: boolean;
  workspaces: Array<{ id: string; name: string; role: string }>;
  eventCount: number;
  liveEventCount: number;
}

export interface OrganizerList {
  items: OrganizerRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<'all' | OrganizerStatus, number>;
}

function statusOf(a: AccountInfo): OrganizerStatus {
  if (isBlocked(a)) return 'blocked';
  if (!a.emailConfirmedAt) return 'unverified';
  return 'active';
}

export async function listOrganizers(query: {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
}): Promise<Result<OrganizerList>> {
  try {
    await context('customers.read');
    const [dir, accounts] = await Promise.all([loadDirectory(), listAccounts()]);
    const adminIds = new Set(dir.platformRoles.filter((r) => r.is_active).map((r) => r.user_id));
    const wsById = new Map(dir.workspaces.map((w) => [w.id, w]));

    const rows: OrganizerRow[] = accounts.map((a) => {
      const memberships = dir.members.filter((m) => m.user_id === a.id);
      const ws = memberships
        .map((m) => ({ id: m.workspace_id, name: wsById.get(m.workspace_id)?.name ?? 'Workspace', role: dir.roleNames.get(m.role_id ?? '') ?? 'member' }));
      for (const w of dir.workspaces.filter((w) => w.owner_id === a.id && !ws.some((x) => x.id === w.id))) {
        ws.push({ id: w.id, name: w.name, role: 'workspace_owner' });
      }
      const wsIds = new Set(ws.map((w) => w.id));
      const events = dir.events.filter((e) => wsIds.has(e.workspace_id));
      return {
        id: a.id,
        email: a.email,
        name: dir.names.get(a.id) ?? null,
        createdAt: a.createdAt,
        lastSignInAt: a.lastSignInAt,
        status: statusOf(a),
        isPlatformAdmin: adminIds.has(a.id),
        workspaces: ws,
        eventCount: events.length,
        liveEventCount: events.filter((e) => e.status === 'published').length,
      };
    });

    const counts = {
      all: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      blocked: rows.filter((r) => r.status === 'blocked').length,
      unverified: rows.filter((r) => r.status === 'unverified').length,
    };

    const q = query.q?.trim().toLowerCase();
    let filtered = rows.filter((r) =>
      !q ||
      r.email?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q) ||
      r.workspaces.some((w) => w.name.toLowerCase().includes(q)),
    );
    if (query.status === 'active' || query.status === 'blocked' || query.status === 'unverified') {
      filtered = filtered.filter((r) => r.status === query.status);
    }
    filtered.sort((a, b) => {
      if (query.sort === 'active') return (b.lastSignInAt ?? '').localeCompare(a.lastSignInAt ?? '');
      if (query.sort === 'events') return b.eventCount - a.eventCount;
      if (query.sort === 'name') return (a.name || a.email || '').localeCompare(b.name || b.email || '');
      return b.createdAt.localeCompare(a.createdAt);
    });

    const pageSize = 25;
    const page = Math.max(1, query.page ?? 1);
    return {
      ok: true,
      data: { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, counts },
    };
  } catch (err) {
    return fail(err, 'Organizer accounts could not be loaded.');
  }
}

export interface OrganizerDetail {
  account: AccountInfo & { name: string | null; status: OrganizerStatus; isPlatformAdmin: boolean; platformRole: string | null };
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    myRole: string;
    isOwner: boolean;
    isSuspended: boolean | null;
    suspendedReason: string | null;
    members: Array<{ userId: string; email: string | null; name: string | null; roleId: string | null; role: string; isOwner: boolean; joinedAt: string; blocked: boolean }>;
    invitations: Array<{ id: string; email: string; role: string; status: string; createdAt: string }>;
    events: Array<{ id: string; name: string; slug: string; status: string; startDate: string | null; registrations: number; checkIns: number }>;
  }>;
  roles: Array<{ id: string; name: string }>;
  history: Array<{ id: string; action: string; actorEmail: string | null; reason: string | null; createdAt: string }>;
}

export async function getOrganizer(userId: string): Promise<Result<OrganizerDetail> | null> {
  try {
    const { db } = await context('customers.read');
    const [dir, accounts] = await Promise.all([loadDirectory(), listAccounts()]);
    const account = accounts.find((a) => a.id === userId);
    if (!account) return null;
    const byId = new Map(accounts.map((a) => [a.id, a]));

    const wsIds = new Set([
      ...dir.members.filter((m) => m.user_id === userId).map((m) => m.workspace_id),
      ...dir.workspaces.filter((w) => w.owner_id === userId).map((w) => w.id),
    ]);
    const workspaces = dir.workspaces.filter((w) => wsIds.has(w.id));
    const events = dir.events.filter((e) => wsIds.has(e.workspace_id));
    const [{ regs, checkins }, invites, history] = await Promise.all([
      countsByEvent(db, events.map((e) => e.id)),
      wsIds.size
        ? db.from('workspace_invitations').select('id, workspace_id, email, role_id, status, created_at').in('workspace_id', [...wsIds]).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      db.from('platform_audit_logs').select('id, actor_user_id, action, reason, created_at')
        .in('target_id', [userId, ...wsIds, ...events.map((e) => e.id)])
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    const platformRole = dir.platformRoles.find((r) => r.user_id === userId && r.is_active)?.role ?? null;

    return {
      ok: true,
      data: {
        account: {
          ...account,
          name: dir.names.get(userId) ?? null,
          status: statusOf(account),
          isPlatformAdmin: Boolean(platformRole),
          platformRole,
        },
        roles: dir.roles,
        workspaces: workspaces.map((w) => {
          const mine = dir.members.find((m) => m.workspace_id === w.id && m.user_id === userId);
          return {
            id: w.id,
            name: w.name,
            slug: w.slug,
            createdAt: w.created_at,
            isOwner: w.owner_id === userId,
            myRole: w.owner_id === userId ? 'workspace_owner' : dir.roleNames.get(mine?.role_id ?? '') ?? 'member',
            isSuspended: 'is_suspended' in w ? Boolean(w.is_suspended) : null,
            suspendedReason: w.suspended_reason ?? null,
            members: dir.members
              .filter((m) => m.workspace_id === w.id)
              .map((m) => ({
                userId: m.user_id,
                email: byId.get(m.user_id)?.email ?? null,
                name: dir.names.get(m.user_id) ?? null,
                roleId: m.role_id,
                role: dir.roleNames.get(m.role_id ?? '') ?? 'member',
                isOwner: w.owner_id === m.user_id,
                joinedAt: m.created_at,
                blocked: byId.has(m.user_id) ? isBlocked(byId.get(m.user_id)!) : false,
              })),
            invitations: ((invites.data || []) as Array<{ id: string; workspace_id: string; email: string; role_id: string | null; status: string; created_at: string }>)
              .filter((i) => i.workspace_id === w.id)
              .map((i) => ({ id: i.id, email: i.email, role: dir.roleNames.get(i.role_id ?? '') ?? 'member', status: i.status, createdAt: i.created_at })),
            events: events
              .filter((e) => e.workspace_id === w.id)
              .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
              .map((e) => ({
                id: e.id, name: e.name, slug: e.slug, status: e.status, startDate: e.start_date,
                registrations: regs.get(e.id) ?? 0, checkIns: checkins.get(e.id) ?? 0,
              })),
          };
        }),
        history: ((history.data || []) as Array<{ id: string; actor_user_id: string; action: string; reason: string | null; created_at: string }>).map((h) => ({
          id: h.id,
          action: h.action,
          actorEmail: byId.get(h.actor_user_id)?.email ?? null,
          reason: h.reason,
          createdAt: h.created_at,
        })),
      },
    };
  } catch (err) {
    return fail(err, 'This organizer account could not be loaded.');
  }
}

// --- Organizer access controls ---------------------------------------------

type Mutation = Promise<{ ok: true; message: string } | { ok: false; message: string }>;

export async function setOrganizerBlocked(userId: string, block: boolean, reason: string): Mutation {
  try {
    const { db, actor } = await context('customers.manage');
    if (userId === actor.id) return { ok: false, message: 'You can’t block your own account.' };
    if (block && reason.trim().length < 3) return { ok: false, message: 'Add a reason so other admins know why.' };
    const dir = await loadDirectory();
    if (block && dir.platformRoles.some((r) => r.user_id === userId && r.is_active)) {
      return { ok: false, message: 'This person is a platform admin. Remove their admin access first.' };
    }
    const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: block ? '876000h' : 'none' });
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, block ? 'organizer.blocked' : 'organizer.unblocked', 'user', userId, reason.trim() || null);
    return { ok: true, message: block ? 'Account blocked. They’re signed out within the hour and can’t sign back in.' : 'Account unblocked. They can sign in again.' };
  } catch (err) {
    return fail(err, 'The account could not be updated.');
  }
}

export async function confirmOrganizerEmail(userId: string): Mutation {
  try {
    const { db, actor } = await context('customers.manage');
    const { error } = await db.auth.admin.updateUserById(userId, { email_confirm: true });
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, 'organizer.email_confirmed', 'user', userId, 'Email marked as verified by an admin.');
    return { ok: true, message: 'Email marked as verified.' };
  } catch (err) {
    return fail(err, 'The email could not be verified.');
  }
}

export async function sendOrganizerPasswordReset(userId: string): Mutation {
  try {
    const { db, actor } = await context('customers.manage');
    const account = (await listAccounts()).find((a) => a.id === userId);
    if (!account?.email) return { ok: false, message: 'This account has no email address.' };
    const { error } = await publicAuthClient().auth.resetPasswordForEmail(account.email, resetRedirect());
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, 'organizer.password_reset_sent', 'user', userId, null);
    return { ok: true, message: `Password reset email sent to ${account.email}.` };
  } catch (err) {
    return fail(err, 'The reset email could not be sent.');
  }
}

export async function setWorkspaceSuspended(workspaceId: string, suspend: boolean, reason: string): Mutation {
  try {
    const { db, actor } = await context('customers.manage');
    if (suspend && reason.trim().length < 3) return { ok: false, message: 'Add a reason so the organizer and other admins know why.' };
    const { error } = await db
      .from('workspaces')
      .update(suspend
        ? { is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: reason.trim(), suspended_by: actor.id }
        : { is_suspended: false, suspended_at: null, suspended_reason: null, suspended_by: null })
      .eq('id', workspaceId);
    if (isMissingColumn(error)) return { ok: false, message: `Workspace suspension needs the setup SQL. Run ${SETUP_SQL} in Supabase first.` };
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, suspend ? 'workspace.suspended' : 'workspace.reactivated', 'workspace', workspaceId, reason.trim() || null);
    return { ok: true, message: suspend ? 'Workspace suspended.' : 'Workspace reactivated.' };
  } catch (err) {
    return fail(err, 'The workspace could not be updated.');
  }
}

export async function setMemberRole(workspaceId: string, userId: string, roleId: string): Mutation {
  try {
    const { db, actor } = await context('customers.manage');
    const dir = await loadDirectory();
    if (dir.workspaces.find((w) => w.id === workspaceId)?.owner_id === userId) {
      return { ok: false, message: 'The workspace owner always keeps the owner role.' };
    }
    const role = dir.roles.find((r) => r.id === roleId);
    if (!role || role.name === 'workspace_owner') return { ok: false, message: 'Pick an admin, editor, member or viewer role.' };
    const { error } = await db.from('workspace_members').update({ role_id: roleId }).eq('workspace_id', workspaceId).eq('user_id', userId);
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, 'workspace.member_role_changed', 'workspace', workspaceId, null, { userId, role: role.name });
    return { ok: true, message: `Role changed to ${role.name}.` };
  } catch (err) {
    return fail(err, 'The role could not be changed.');
  }
}

export async function removeMember(workspaceId: string, userId: string): Mutation {
  try {
    const { db, actor } = await context('customers.manage');
    const dir = await loadDirectory();
    if (dir.workspaces.find((w) => w.id === workspaceId)?.owner_id === userId) {
      return { ok: false, message: 'The workspace owner can’t be removed.' };
    }
    const { error } = await db.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, 'workspace.member_removed', 'workspace', workspaceId, null, { userId });
    return { ok: true, message: 'Removed from the workspace.' };
  } catch (err) {
    return fail(err, 'The member could not be removed.');
  }
}

export async function revokeInvitation(invitationId: string): Mutation {
  try {
    const { db, actor } = await context('customers.manage');
    const { data, error } = await db.from('workspace_invitations').update({ status: 'revoked' }).eq('id', invitationId).select('workspace_id').single();
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, 'workspace.invitation_revoked', 'workspace', data.workspace_id, null, { invitationId });
    return { ok: true, message: 'Invitation revoked.' };
  } catch (err) {
    return fail(err, 'The invitation could not be revoked.');
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface EventRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  type: string | null;
  startDate: string | null;
  location: string | null;
  workspaceId: string;
  workspaceName: string;
  ownerId: string | null;
  ownerEmail: string | null;
  registrations: number;
  checkIns: number;
  createdAt: string;
}

export async function listEvents(query: { q?: string; status?: string; when?: string; page?: number }): Promise<
  Result<{ items: EventRow[]; total: number; page: number; pageSize: number; counts: Record<string, number> }>
> {
  try {
    const { db } = await context('events.read');
    const [dir, accounts] = await Promise.all([loadDirectory(), listAccounts()]);
    const emailOf = new Map(accounts.map((a) => [a.id, a.email]));
    const wsById = new Map(dir.workspaces.map((w) => [w.id, w]));
    const today = new Date().toISOString().slice(0, 10);
    const q = query.q?.trim().toLowerCase();

    const counts = {
      all: dir.events.length,
      published: dir.events.filter((e) => e.status === 'published').length,
      draft: dir.events.filter((e) => e.status === 'draft').length,
      archived: dir.events.filter((e) => e.status === 'archived').length,
    };

    const filtered = dir.events
      .filter((e) => !query.status || query.status === 'all' || e.status === query.status)
      .filter((e) => query.when === 'upcoming' ? (e.start_date ?? '') >= today : query.when === 'past' ? Boolean(e.start_date && e.start_date < today) : true)
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q) || (wsById.get(e.workspace_id)?.name ?? '').toLowerCase().includes(q))
      .sort((a, b) => (b.start_date ?? b.created_at).localeCompare(a.start_date ?? a.created_at));

    const pageSize = 25;
    const page = Math.max(1, query.page ?? 1);
    const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
    const { regs, checkins } = await countsByEvent(db, slice.map((e) => e.id));

    return {
      ok: true,
      data: {
        total: filtered.length,
        page,
        pageSize,
        counts,
        items: slice.map((e) => {
          const ws = wsById.get(e.workspace_id);
          return {
            id: e.id, name: e.name, slug: e.slug, status: e.status, type: e.type, startDate: e.start_date, location: e.location,
            workspaceId: e.workspace_id, workspaceName: ws?.name ?? 'Unknown workspace',
            ownerId: ws?.owner_id ?? null, ownerEmail: ws?.owner_id ? emailOf.get(ws.owner_id) ?? null : null,
            registrations: regs.get(e.id) ?? 0, checkIns: checkins.get(e.id) ?? 0, createdAt: e.created_at,
          };
        }),
      },
    };
  } catch (err) {
    return fail(err, 'Events could not be loaded.');
  }
}

const EVENT_STATUS_VERB: Record<string, string> = { published: 'published', draft: 'unpublished', archived: 'archived' };

export async function setEventStatus(eventId: string, status: 'published' | 'draft' | 'archived', reason: string): Mutation {
  try {
    const { db, actor } = await context('events.moderate');
    if (!EVENT_STATUS_VERB[status]) return { ok: false, message: 'Unknown event status.' };
    if (status !== 'published' && reason.trim().length < 3) return { ok: false, message: 'Add a reason so the organizer knows why.' };
    const { error } = await db.from('events').update({ status }).eq('id', eventId);
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, `event.${EVENT_STATUS_VERB[status]}`, 'event', eventId, reason.trim() || null);
    return { ok: true, message: `Event ${EVENT_STATUS_VERB[status]}.` };
  } catch (err) {
    return fail(err, 'The event could not be updated.');
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  months: Array<{ month: string; organizers: number; workspaces: number; events: number; registrations: number; checkIns: number }>;
  eventsByType: Array<{ type: string; count: number }>;
  eventsByStatus: Array<{ status: string; count: number }>;
  topEvents: Array<{ id: string; name: string; workspaceName: string; registrations: number; checkIns: number }>;
  totals: { registrations: number; checkIns: number; attendanceRate: number | null };
}

export async function getAnalytics(): Promise<Result<AnalyticsData>> {
  try {
    const { db } = await context('console.view');
    const [dir, accounts] = await Promise.all([loadDirectory(), listAccounts()]);

    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      return { key: d.toISOString().slice(0, 7), from: d.toISOString(), to: next.toISOString() };
    });
    const inMonth = (iso: string, m: { from: string; to: string }) => iso >= m.from && iso < m.to;

    const monthly = await Promise.all(
      months.map(async (m) => {
        const [r, c] = await Promise.all([
          db.from('registrations').select('id', { count: 'exact', head: true }).gte('created_at', m.from).lt('created_at', m.to),
          db.from('check_ins').select('id', { count: 'exact', head: true }).gte('scanned_at', m.from).lt('scanned_at', m.to).eq('result', 'allowed'),
        ]);
        return {
          month: m.key,
          organizers: accounts.filter((a) => inMonth(a.createdAt, m)).length,
          workspaces: dir.workspaces.filter((w) => inMonth(w.created_at, m)).length,
          events: dir.events.filter((e) => inMonth(e.created_at, m)).length,
          registrations: r.count ?? 0,
          checkIns: c.count ?? 0,
        };
      }),
    );

    const tally = (values: string[]) => {
      const map = new Map<string, number>();
      for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const { regs, checkins } = await countsByEvent(db, dir.events.map((e) => e.id));
    const wsName = new Map(dir.workspaces.map((w) => [w.id, w.name]));
    const totalRegs = [...regs.values()].reduce((s, n) => s + n, 0);
    const totalCheckIns = [...checkins.values()].reduce((s, n) => s + n, 0);

    return {
      ok: true,
      data: {
        months: monthly,
        eventsByType: tally(dir.events.map((e) => e.type || 'other')).map(([type, count]) => ({ type, count })),
        eventsByStatus: tally(dir.events.map((e) => e.status)).map(([status, count]) => ({ status, count })),
        topEvents: dir.events
          .map((e) => ({ id: e.id, name: e.name, workspaceName: wsName.get(e.workspace_id) ?? '', registrations: regs.get(e.id) ?? 0, checkIns: checkins.get(e.id) ?? 0 }))
          .sort((a, b) => b.registrations - a.registrations)
          .slice(0, 8),
        totals: { registrations: totalRegs, checkIns: totalCheckIns, attendanceRate: totalRegs ? totalCheckIns / totalRegs : null },
      },
    };
  } catch (err) {
    return fail(err, 'Analytics could not be loaded.');
  }
}

// ---------------------------------------------------------------------------
// Audit log & live activity
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  targetHref: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function listAuditLog(query: { q?: string; type?: string; page?: number }): Promise<
  Result<{ items: AuditEntry[]; total: number; page: number; pageSize: number }>
> {
  try {
    const { db } = await context('console.view');
    const pageSize = 30;
    const page = Math.max(1, query.page ?? 1);
    let req = db.from('platform_audit_logs').select('*', { count: 'exact' });
    if (query.type && query.type !== 'all') req = req.eq('target_type', query.type);
    if (query.q) req = req.or(`action.ilike.%${query.q.replace(/[%,()]/g, '')}%,reason.ilike.%${query.q.replace(/[%,()]/g, '')}%`);
    const { data, count, error } = await req.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) return { ok: false, message: `The audit log couldn’t be read (${error.message}). Run ${SETUP_SQL} to grant access.` };

    const [dir, accounts] = await Promise.all([loadDirectory(), listAccounts()]);
    const emailOf = new Map(accounts.map((a) => [a.id, a.email]));
    const ws = new Map(dir.workspaces.map((w) => [w.id, w]));
    const ev = new Map(dir.events.map((e) => [e.id, e]));

    const label = (type: string | null, id: string | null): [string | null, string | null] => {
      if (!id) return [null, null];
      if (type === 'user' || type === 'platform_session' || type === 'platform_role') {
        return [emailOf.get(id) ?? id, type === 'user' ? `/super-admin/organizers/${id}` : null];
      }
      if (type === 'workspace') {
        const w = ws.get(id);
        return [w?.name ?? id, w?.owner_id ? `/super-admin/organizers/${w.owner_id}` : null];
      }
      if (type === 'event') {
        const e = ev.get(id);
        return [e?.name ?? id, e ? `/super-admin/events?q=${encodeURIComponent(e.slug)}` : null];
      }
      return [id, null];
    };

    return {
      ok: true,
      data: {
        total: count ?? 0,
        page,
        pageSize,
        items: (data || []).map((r: { id: string; actor_user_id: string; action: string; target_type: string | null; target_id: string | null; reason: string | null; metadata: Record<string, unknown> | null; created_at: string }) => {
          const [targetLabel, targetHref] = label(r.target_type, r.target_id);
          return {
            id: r.id, action: r.action, actorEmail: emailOf.get(r.actor_user_id) ?? null, targetType: r.target_type, targetId: r.target_id,
            targetLabel, targetHref, reason: r.reason, metadata: r.metadata || {}, createdAt: r.created_at,
          };
        }),
      },
    };
  } catch (err) {
    return fail(err, 'The audit log could not be loaded.');
  }
}

export interface ActivityItem {
  id: string;
  kind: 'signup' | 'workspace' | 'event' | 'registration' | 'check_in' | 'check_in_denied';
  title: string;
  detail: string;
  href: string | null;
  at: string;
}

/** A live feed built from the platform's own tables: what's happening across every workspace. */
export async function listActivity(kind?: string): Promise<Result<ActivityItem[]>> {
  try {
    const { db } = await context('console.view');
    const [dir, accounts] = await Promise.all([loadDirectory(), listAccounts()]);
    const ws = new Map(dir.workspaces.map((w) => [w.id, w]));
    const ev = new Map(dir.events.map((e) => [e.id, e]));
    const since = new Date(Date.now() - 30 * DAY).toISOString();

    const [regs, checks] = await Promise.all([
      db.from('registrations').select('id, event_id, registration_number, status, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(60),
      db.from('check_ins').select('id, event_id, result, reason, scanned_at').gte('scanned_at', since).order('scanned_at', { ascending: false }).limit(60),
    ]);

    const eventLabel = (id: string) => {
      const e = ev.get(id);
      return e ? `${e.name}, ${ws.get(e.workspace_id)?.name ?? 'workspace'}` : 'Unknown event';
    };
    const ownerHref = (workspaceId: string | undefined) => {
      const owner = workspaceId ? ws.get(workspaceId)?.owner_id : null;
      return owner ? `/super-admin/organizers/${owner}` : null;
    };

    const items: ActivityItem[] = [
      ...accounts.filter((a) => a.createdAt >= since).map((a) => ({
        id: `u-${a.id}`, kind: 'signup' as const, title: 'New organizer account', detail: a.email ?? 'No email',
        href: `/super-admin/organizers/${a.id}`, at: a.createdAt,
      })),
      ...dir.workspaces.filter((w) => w.created_at >= since).map((w) => ({
        id: `w-${w.id}`, kind: 'workspace' as const, title: 'Workspace created', detail: w.name, href: ownerHref(w.id), at: w.created_at,
      })),
      ...dir.events.filter((e) => e.created_at >= since).map((e) => ({
        id: `e-${e.id}`, kind: 'event' as const, title: 'Event created', detail: eventLabel(e.id),
        href: `/super-admin/events?q=${encodeURIComponent(e.slug)}`, at: e.created_at,
      })),
      ...((regs.data || []) as Array<{ id: string; event_id: string; registration_number: string | null; status: string; created_at: string }>).map((r) => ({
        id: `r-${r.id}`, kind: 'registration' as const, title: `Registration ${r.registration_number ?? ''}`.trim(),
        detail: `${eventLabel(r.event_id)}, ${r.status}`, href: ownerHref(ev.get(r.event_id)?.workspace_id), at: r.created_at,
      })),
      ...((checks.data || []) as Array<{ id: string; event_id: string; result: string; reason: string | null; scanned_at: string }>).map((c) => ({
        id: `c-${c.id}`, kind: c.result === 'allowed' ? ('check_in' as const) : ('check_in_denied' as const),
        title: c.result === 'allowed' ? 'Attendee checked in' : 'Check-in refused',
        detail: `${eventLabel(c.event_id)}${c.reason ? `, ${c.reason.replace(/_/g, ' ')}` : ''}`,
        href: ownerHref(ev.get(c.event_id)?.workspace_id), at: c.scanned_at,
      })),
    ];

    return {
      ok: true,
      data: items
        .filter((i) => !kind || kind === 'all' || i.kind === kind || (kind === 'check_in' && i.kind === 'check_in_denied'))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 120),
    };
  } catch (err) {
    return fail(err, 'Activity could not be loaded.');
  }
}

// ---------------------------------------------------------------------------
// Platform admin access & own account
// ---------------------------------------------------------------------------

export type PlatformRoleName = 'super_admin' | 'support' | 'moderator';
export const PLATFORM_ROLES: Array<{ id: PlatformRoleName; label: string; description: string }> = [
  { id: 'super_admin', label: 'Super admin', description: 'Everything, including admin access and settings.' },
  { id: 'moderator', label: 'Moderator', description: 'View accounts and events, publish or take down events.' },
  { id: 'support', label: 'Support', description: 'View accounts, events and activity. No changes.' },
];

export interface AdminMember {
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  isActive: boolean;
  grantedAt: string;
  lastSignInAt: string | null;
  pendingInvite: boolean;
}

export async function listPlatformAdmins(): Promise<Result<{ admins: AdminMember[]; meId: string; canManage: boolean }>> {
  try {
    const { db, actor, session } = await context('console.view');
    const [{ data, error }, accounts, dir, canManage] = await Promise.all([
      db.from('platform_roles').select('user_id, role, is_active, created_at').order('created_at'),
      listAccounts(),
      loadDirectory(),
      session.rpc('has_platform_permission', { p_permission: 'settings.manage' }),
    ]);
    if (error) return { ok: false, message: error.message };
    const byId = new Map(accounts.map((a) => [a.id, a]));
    return {
      ok: true,
      data: {
        meId: actor.id,
        canManage: canManage.data === true,
        admins: (data || []).map((r: { user_id: string; role: string; is_active: boolean; created_at: string }) => {
          const a = byId.get(r.user_id);
          return {
            userId: r.user_id, email: a?.email ?? null, name: dir.names.get(r.user_id) ?? null, role: r.role,
            isActive: r.is_active !== false, grantedAt: r.created_at, lastSignInAt: a?.lastSignInAt ?? null,
            pendingInvite: Boolean(a && !a.lastSignInAt),
          };
        }),
      },
    };
  } catch (err) {
    return fail(err, 'The admin team could not be loaded.');
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function grantPlatformAccess(emailInput: string, role: PlatformRoleName): Mutation {
  try {
    const { db, actor } = await context('settings.manage');
    const email = emailInput.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, message: 'Enter a valid email address.' };
    if (!PLATFORM_ROLES.some((r) => r.id === role)) return { ok: false, message: 'Pick a role.' };

    let user = (await listAccounts()).find((a) => a.email?.toLowerCase() === email);
    let invited = false;
    if (!user) {
      // New person: create a verified account, then send the standard
      // set-password (recovery) email, which the reset-password page handles.
      const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
      if (error || !data.user) return { ok: false, message: error?.message || 'The account could not be created.' };
      user = toAccount(data.user as User & { banned_until?: string | null });
      const { error: mailError } = await publicAuthClient().auth.resetPasswordForEmail(email, resetRedirect());
      if (mailError) console.warn('Set-password email failed:', mailError.message);
      invited = true;
    }

    const { error } = await db.from('platform_roles').upsert({ user_id: user.id, role, is_active: true }, { onConflict: 'user_id' });
    if (error) return { ok: false, message: `${error.message}. Run ${SETUP_SQL} in Supabase if this keeps happening.` };
    await audit(db, actor.id, 'platform.access_granted', 'platform_role', user.id, null, { email, role, invited });
    const label = PLATFORM_ROLES.find((r) => r.id === role)!.label.toLowerCase();
    return {
      ok: true,
      message: invited
        ? `Created an account for ${email} with ${label} access and emailed them a link to set a password.`
        : `${email} now has ${label} access.`,
    };
  } catch (err) {
    return fail(err, 'Access could not be granted.');
  }
}

async function guardLastSuperAdmin(db: Db, userId: string, next: { role?: string; isActive?: boolean; removing?: boolean }) {
  const { data } = await db.from('platform_roles').select('user_id, role, is_active');
  const supers = (data || []).filter((r: { role: string; is_active: boolean }) => (r.role === 'super_admin' || r.role === 'platform_super_admin') && r.is_active !== false);
  const target = supers.find((r: { user_id: string }) => r.user_id === userId);
  const losesSuper = target && (next.removing || next.isActive === false || (next.role && next.role !== 'super_admin'));
  return losesSuper && supers.length <= 1;
}

export async function updatePlatformAccess(userId: string, change: { role?: PlatformRoleName; isActive?: boolean }): Mutation {
  try {
    const { db, actor } = await context('settings.manage');
    if (userId === actor.id) return { ok: false, message: 'You can’t change your own access. Ask another super admin.' };
    if (change.role && !PLATFORM_ROLES.some((r) => r.id === change.role)) return { ok: false, message: 'Pick a role.' };
    if (await guardLastSuperAdmin(db, userId, change)) return { ok: false, message: 'Keep at least one active super admin.' };
    const patch: Record<string, unknown> = {};
    if (change.role) patch.role = change.role;
    if (typeof change.isActive === 'boolean') patch.is_active = change.isActive;
    const { error } = await db.from('platform_roles').update(patch).eq('user_id', userId);
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, change.role ? 'platform.role_changed' : change.isActive ? 'platform.access_resumed' : 'platform.access_paused', 'platform_role', userId, null, patch);
    return { ok: true, message: change.role ? 'Role updated.' : change.isActive ? 'Access resumed.' : 'Access paused. They can’t open the console until it’s resumed.' };
  } catch (err) {
    return fail(err, 'Access could not be updated.');
  }
}

export async function revokePlatformAccess(userId: string): Mutation {
  try {
    const { db, actor } = await context('settings.manage');
    if (userId === actor.id) return { ok: false, message: 'You can’t remove your own access. Ask another super admin.' };
    if (await guardLastSuperAdmin(db, userId, { removing: true })) return { ok: false, message: 'Keep at least one active super admin.' };
    const { error } = await db.from('platform_roles').delete().eq('user_id', userId);
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, 'platform.access_revoked', 'platform_role', userId, null);
    return { ok: true, message: 'Admin access removed. Their organizer account is unchanged.' };
  } catch (err) {
    return fail(err, 'Access could not be removed.');
  }
}

export interface MyAccount {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  createdAt: string;
  lastSignInAt: string | null;
}

export async function getMyAccount(): Promise<Result<MyAccount>> {
  try {
    const { db, actor } = await context('console.view');
    const [{ data: profile }, { data: role }] = await Promise.all([
      db.from('profiles').select('full_name').eq('id', actor.id).maybeSingle(),
      db.from('platform_roles').select('role').eq('user_id', actor.id).maybeSingle(),
    ]);
    return {
      ok: true,
      data: {
        id: actor.id, email: actor.email ?? null, name: profile?.full_name ?? null, role: role?.role ?? null,
        createdAt: actor.created_at, lastSignInAt: actor.last_sign_in_at ?? null,
      },
    };
  } catch (err) {
    return fail(err, 'Your account could not be loaded.');
  }
}

export async function updateMyName(fullName: string): Mutation {
  try {
    const { db, actor } = await context('console.view');
    const name = fullName.trim();
    if (name.length < 2 || name.length > 80) return { ok: false, message: 'Use 2 to 80 characters.' };
    const { error } = await db.from('profiles').upsert({ id: actor.id, full_name: name }, { onConflict: 'id' });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Name saved.' };
  } catch (err) {
    return fail(err, 'Your name could not be saved.');
  }
}

export async function changeMyPassword(current: string, next: string): Mutation {
  try {
    const { db, actor } = await context('console.view');
    if (next.length < 10) return { ok: false, message: 'Use at least 10 characters for the new password.' };
    if (next === current) return { ok: false, message: 'The new password must be different.' };
    const verifier = publicAuthClient();
    const { error: signInError } = await verifier.auth.signInWithPassword({ email: actor.email!, password: current });
    if (signInError) return { ok: false, message: 'Your current password is incorrect.' };
    await verifier.auth.signOut();
    const { error } = await db.auth.admin.updateUserById(actor.id, { password: next });
    if (error) return { ok: false, message: error.message };
    await audit(db, actor.id, 'admin.password_changed', 'user', actor.id, null);
    return { ok: true, message: 'Password changed.' };
  } catch (err) {
    return fail(err, 'Your password could not be changed.');
  }
}
