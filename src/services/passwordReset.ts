import type { createAdminClient } from '@/lib/supabase/admin';
import { sendPasswordResetEmail } from '@/services/organizerMailer';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Creates a recovery link and emails it from the platform sender. generateLink sends nothing
 * itself, and the implicit-flow link it returns is what /reset-password reads from the URL hash.
 * Returns false, without sending, when no account has this email.
 */
export async function sendPasswordResetLink(
  adminClient: AdminClient,
  email: string,
  redirectTo: string | undefined
): Promise<boolean> {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });
  if (error?.code === 'user_not_found') return false;
  if (error) throw error;

  await sendPasswordResetEmail(email, data.properties.action_link);
  return true;
}
