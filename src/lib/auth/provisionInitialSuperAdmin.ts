const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ProvisioningDependencies {
  getConfirmedUser: (userId: string) => Promise<string | null>;
  provision: (
    actorUserId: string,
    targetUserId: string,
  ) => Promise<{ data: boolean | null; error: { message?: string } | null }>;
}

export async function provisionInitialSuperAdmin(
  actorUserId: string,
  targetUserId: string,
  dependencies: ProvisioningDependencies,
): Promise<'provisioned' | 'already-provisioned'> {
  if (!UUID_PATTERN.test(actorUserId) || !UUID_PATTERN.test(targetUserId)) {
    throw new Error('Operator and target user IDs must be valid UUIDs');
  }

  for (const userId of new Set([actorUserId, targetUserId])) {
    if (await dependencies.getConfirmedUser(userId) !== userId) {
      throw new Error('Operator and target must be existing confirmed Auth accounts');
    }
  }

  const { data, error } = await dependencies.provision(actorUserId, targetUserId);
  if (error) throw new Error(`Initial Super Admin provisioning failed: ${error.message || 'unknown error'}`);
  if (data === true) return 'provisioned';
  if (data === false) return 'already-provisioned';
  throw new Error('Initial Super Admin provisioning returned an invalid result');
}
