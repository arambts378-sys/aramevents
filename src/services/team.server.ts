import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWorkspacePlan } from '@/app/actions/planActions';

/**
 * Workspace team management. Every entry point resolves the caller from the
 * session cookie and checks their role in the workspace before the service-role
 * client touches anything, so the admin client never acts on unchecked input.
 */

export const ASSIGNABLE_ROLES = ['admin', 'editor', 'member', 'viewer'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const RANK: Record<string, number> = { workspace_owner: 4, admin: 3, editor: 2, member: 1, viewer: 0 };
const rank = (role: string | null | undefined) => (role && role in RANK ? RANK[role] : -1);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TeamError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface TeamActor {
  userId: string;
  email: string;
  workspaceId: string;
  role: string;
  isOwner: boolean;
}

/** Resolves the signed-in user and their role in the workspace, or throws a TeamError. */
export async function resolveActor(workspaceId: unknown): Promise<TeamActor> {
  if (typeof workspaceId !== 'string' || !UUID_RE.test(workspaceId)) {
    throw new TeamError('Missing or invalid workspace.', 400);
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new TeamError('Please sign in again.', 401);

  const admin = createAdminClient();
  const [{ data: membership }, { data: workspace }] = await Promise.all([
    admin
      .from('workspace_members')
      .select('roles(name)')
      .eq('workspace_id', workspaceId)
      .eq('user_id', auth.user.id)
      .maybeSingle(),
    admin.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle(),
  ]);
  if (!workspace) throw new TeamError('Workspace not found.', 404);

  const isOwner = workspace.owner_id === auth.user.id;
  const roleName = (membership as { roles?: { name?: string } | null } | null)?.roles?.name;
  if (!membership && !isOwner) throw new TeamError('You are not a member of this workspace.', 403);

  return {
    userId: auth.user.id,
    email: (auth.user.email || '').toLowerCase(),
    workspaceId,
    role: isOwner ? 'workspace_owner' : roleName || 'viewer',
    isOwner,
  };
}

export function canManageTeam(actor: TeamActor) {
  return rank(actor.role) >= RANK.admin;
}

/** Owners can grant admin; admins can grant editor and below. Nobody can grant owner. */
export function assertCanGrant(actor: TeamActor, role: string): asserts role is AssignableRole {
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) throw new TeamError('Choose a valid role.', 400);
  if (!canManageTeam(actor)) throw new TeamError('Only owners and admins can manage the team.', 403);
  if (rank(role) >= rank(actor.role)) throw new TeamError('You can only give roles below your own.', 403);
}

async function roleIds() {
  const { data, error } = await createAdminClient().from('roles').select('id, name');
  if (error || !data) throw new TeamError('Could not load roles.', 500);
  return {
    byName: new Map(data.map((r) => [r.name as string, r.id as string])),
    byId: new Map(data.map((r) => [r.id as string, r.name as string])),
  };
}

export async function listTeam(actor: TeamActor) {
  const admin = createAdminClient();
  const [{ data: members, error: mErr }, roles, { data: workspace }] = await Promise.all([
    admin.from('workspace_members').select('user_id, role_id, created_at').eq('workspace_id', actor.workspaceId),
    roleIds(),
    admin.from('workspaces').select('owner_id').eq('id', actor.workspaceId).single(),
  ]);
  if (mErr) throw new TeamError('Could not load team members.', 500);

  const ids = (members || []).map((m) => m.user_id as string);
  const { data: profiles } = ids.length
    ? await admin.from('profiles').select('id, full_name, avatar_url').in('id', ids)
    : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  const emails = await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data.user?.email || ''] as const;
    })
  );
  const emailById = new Map(emails);

  const list = (members || []).map((m) => {
    const isOwner = m.user_id === workspace?.owner_id;
    return {
      userId: m.user_id as string,
      name: profileById.get(m.user_id)?.full_name || emailById.get(m.user_id)?.split('@')[0] || 'Member',
      email: emailById.get(m.user_id) || '',
      role: isOwner ? 'workspace_owner' : roles.byId.get(m.role_id as string) || 'viewer',
      joinedAt: m.created_at as string,
      isOwner,
      isYou: m.user_id === actor.userId,
    };
  });
  list.sort((a, b) => rank(b.role) - rank(a.role) || a.name.localeCompare(b.name));

  let invitations: { id: string; email: string; role: string; createdAt: string; expiresAt: string }[] = [];
  if (canManageTeam(actor)) {
    const { data } = await admin
      .from('workspace_invitations')
      .select('id, email, role_id, created_at, expires_at, metadata')
      .eq('workspace_id', actor.workspaceId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    invitations = (data || [])
      // Event scanner invitations carry an event_id; they are managed from the event, not here.
      .filter((i) => !(i.metadata && typeof i.metadata === 'object' && 'event_id' in i.metadata))
      .map((i) => ({
        id: i.id as string,
        email: i.email as string,
        role: roles.byId.get(i.role_id as string) || 'viewer',
        createdAt: i.created_at as string,
        expiresAt: i.expires_at as string,
      }));
  }

  const plan = await getWorkspacePlan(actor.workspaceId);
  const maxMembers = plan.ok ? plan.data.entitlements.maxTeamMembers : null;

  return {
    you: { role: actor.role, canManage: canManageTeam(actor) },
    members: list,
    invitations,
    limit: { maxMembers, used: list.length + invitations.length },
  };
}

export async function inviteMember(actor: TeamActor, rawEmail: unknown, role: string) {
  assertCanGrant(actor, role);
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new TeamError('Enter a valid email address.', 400);
  }
  if (email === actor.email) throw new TeamError('You are already in this workspace.', 400);

  const team = await listTeam(actor);
  if (team.members.some((m) => m.email.toLowerCase() === email)) {
    throw new TeamError('This person is already a member. Change their role instead.', 409);
  }
  if (team.invitations.some((i) => i.email.toLowerCase() === email)) {
    throw new TeamError('An invitation is already waiting for this email. Revoke it to send a new one.', 409);
  }
  if (team.limit.maxMembers !== null && team.limit.used >= team.limit.maxMembers) {
    throw new TeamError(
      `Your plan allows ${team.limit.maxMembers} team members, including pending invitations. Remove someone or upgrade to invite more.`,
      403
    );
  }

  const roles = await roleIds();
  const { data, error } = await createAdminClient()
    .from('workspace_invitations')
    .insert({
      workspace_id: actor.workspaceId,
      email,
      role_id: roles.byName.get(role),
      invited_by: actor.userId,
    })
    .select('id, token, expires_at')
    .single();
  if (error || !data) throw new TeamError('Could not create the invitation.', 500);
  return { id: data.id as string, token: data.token as string, email, role, expiresAt: data.expires_at as string };
}

export async function revokeInvitation(actor: TeamActor, invitationId: string) {
  if (!canManageTeam(actor)) throw new TeamError('Only owners and admins can manage the team.', 403);
  if (!UUID_RE.test(invitationId)) throw new TeamError('Invitation not found.', 404);
  const { data, error } = await createAdminClient()
    .from('workspace_invitations')
    .update({ status: 'expired' })
    .eq('id', invitationId)
    .eq('workspace_id', actor.workspaceId)
    .eq('status', 'pending')
    .select('id');
  if (error) throw new TeamError('Could not revoke the invitation.', 500);
  if (!data?.length) throw new TeamError('Invitation not found or already used.', 404);
}

async function targetMember(actor: TeamActor, userId: string) {
  if (!UUID_RE.test(userId)) throw new TeamError('Member not found.', 404);
  const team = await listTeam(actor);
  const target = team.members.find((m) => m.userId === userId);
  if (!target) throw new TeamError('Member not found.', 404);
  if (target.isOwner) throw new TeamError('The workspace owner cannot be changed or removed.', 403);
  if (target.isYou) throw new TeamError('You cannot change your own access.', 403);
  if (rank(target.role) >= rank(actor.role)) throw new TeamError('You can only manage members below your own role.', 403);
  return target;
}

export async function changeMemberRole(actor: TeamActor, userId: string, role: string) {
  assertCanGrant(actor, role);
  await targetMember(actor, userId);
  const roles = await roleIds();
  const { error } = await createAdminClient()
    .from('workspace_members')
    .update({ role_id: roles.byName.get(role) })
    .eq('workspace_id', actor.workspaceId)
    .eq('user_id', userId);
  if (error) throw new TeamError('Could not change the role.', 500);
}

export async function removeMember(actor: TeamActor, userId: string) {
  if (!canManageTeam(actor)) throw new TeamError('Only owners and admins can manage the team.', 403);
  await targetMember(actor, userId);
  const { error } = await createAdminClient()
    .from('workspace_members')
    .delete()
    .eq('workspace_id', actor.workspaceId)
    .eq('user_id', userId);
  if (error) throw new TeamError('Could not remove the member.', 500);
}
