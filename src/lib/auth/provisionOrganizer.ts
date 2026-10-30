import crypto from 'crypto';
import type { createAdminClient } from '@/lib/supabase/admin';
import { normalizeMobile } from '@/lib/validation/auth';

type AdminClient = ReturnType<typeof createAdminClient>;

export class ProvisioningError extends Error {}

function logError(context: string, err: unknown) {
  const e = err as { name?: string; code?: string; status?: number } | null;
  console.error(`[organizer/provision] ${context}`, { name: e?.name, code: e?.code, status: e?.status });
}

/**
 * Idempotently ensures profile, workspace and OWNER membership exist.
 *
 * The auth.users trigger normally created all three when the account was registered, so in the
 * normal case this only refreshes names. It never inserts a second workspace for an owner who
 * already has one, and membership uses an upsert on UNIQUE(workspace_id, user_id).
 */
export async function ensureOrganizerProvisioned(
  adminClient: AdminClient,
  user: { id: string; user_metadata?: Record<string, unknown> },
  normEmail: string
) {
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : 'Organizer';
  const orgName =
    typeof metadata.organization_name === 'string' && metadata.organization_name.trim()
      ? metadata.organization_name.trim()
      : `${fullName}'s Organization`;
  const profile: Record<string, string | null> = {
    id: user.id,
    full_name: fullName,
    avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    updated_at: new Date().toISOString(),
  };
  if (typeof metadata.phone === 'string' && metadata.phone.length > 0) {
    const phone = normalizeMobile(metadata.phone);
    if (!phone.valid || !phone.e164) throw new ProvisioningError('phone');
    profile.phone = phone.e164;
  }

  const { error: profileError } = await adminClient.from('profiles').upsert(profile);
  if (profileError) {
    logError('profile upsert failed', profileError);
    throw new ProvisioningError('profile');
  }

  const findWorkspace = async () => {
    const { data, error } = await adminClient
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) {
      logError('workspace lookup failed', error);
      throw new ProvisioningError('workspace');
    }
    return data && data.length > 0 ? (data[0].id as string) : null;
  };

  let workspaceId = await findWorkspace();

  if (workspaceId) {
    // Name the pre-created workspace after the registered organization before confirming email.
    const { error: renameError } = await adminClient
      .from('workspaces')
      .update({ name: orgName, email: normEmail })
      .eq('id', workspaceId);
    if (renameError) {
      logError('workspace rename failed', renameError);
      throw new ProvisioningError('workspace');
    }
  } else {
    // Fallback only when the trigger did not create one.
    const { error: insertError } = await adminClient.from('workspaces').insert({
      id: crypto.randomUUID(),
      name: orgName,
      slug: `ws-${crypto.randomBytes(4).toString('hex')}`,
      owner_id: user.id,
      email: normEmail,
    });
    if (insertError) logError('workspace insert failed', insertError);

    // Re-read: if a concurrent request created it first we adopt that one.
    workspaceId = await findWorkspace();
    if (!workspaceId) throw new ProvisioningError('workspace');
  }

  const { data: ownerRole, error: roleError } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'workspace_owner')
    .limit(1)
    .maybeSingle();

  if (roleError) {
    logError('owner role lookup failed', roleError);
    throw new ProvisioningError('role');
  }
  if (ownerRole?.id) {
    const { error: memberError } = await adminClient.from('workspace_members').upsert(
      { workspace_id: workspaceId, user_id: user.id, role_id: ownerRole.id },
      { onConflict: 'workspace_id,user_id', ignoreDuplicates: true }
    );
    if (memberError) {
      logError('membership upsert failed', memberError);
      throw new ProvisioningError('membership');
    }
  } else {
    console.error('[organizer/provision] workspace_owner role not found');
    throw new ProvisioningError('role');
  }
}
