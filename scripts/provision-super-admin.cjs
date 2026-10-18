const { register } = require('ts-node');
register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});

const { createAdminClient } = require('../src/lib/supabase/admin');
const { provisionInitialSuperAdmin } = require('../src/lib/auth/provisionInitialSuperAdmin');

async function main() {
  const operatorUserId = process.env.PLATFORM_BOOTSTRAP_OPERATOR_USER_ID;
  const targetUserId = process.env.PLATFORM_INITIAL_SUPER_ADMIN_USER_ID;
  if (!operatorUserId || !targetUserId) {
    throw new Error(
      'Set PLATFORM_BOOTSTRAP_OPERATOR_USER_ID and PLATFORM_INITIAL_SUPER_ADMIN_USER_ID before provisioning.',
    );
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
  }

  const admin = createAdminClient();
  const result = await provisionInitialSuperAdmin(operatorUserId, targetUserId, {
    async getConfirmedUser(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw error;
      return data.user?.email_confirmed_at ? data.user.id : null;
    },
    async provision(actorUserId, userId) {
      const { data, error } = await admin.rpc('provision_initial_super_admin', {
        p_actor_user_id: actorUserId,
        p_target_user_id: userId,
      });
      return { data, error };
    },
  });

  console.log(
    result === 'provisioned'
      ? `Provisioned initial Super Admin for Auth user ${targetUserId}.`
      : `Auth user ${targetUserId} is already the initial Super Admin.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Initial Super Admin provisioning failed.');
  process.exitCode = 1;
});
