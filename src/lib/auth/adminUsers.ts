import type { SupabaseClient, User } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

/**
 * Finds a Supabase Auth user by (already-normalized) email.
 *
 * supabase-js has no "get user by email" admin call, so this pages through listUsers.
 * The previous implementation only read the first page and would miss users beyond it.
 * Only used on the "email already exists" / verification paths, never on the happy path.
 * (A SECURITY DEFINER lookup RPC against auth.users would scale better; that would need a migration.)
 */
export async function findAuthUserByEmail(
  adminClient: SupabaseClient,
  normalizedEmail: string
): Promise<User | null> {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (match) return match;
    if (users.length < PAGE_SIZE) return null;
  }
  return null;
}

/** True when createUser failed because the email is already registered. */
export function isEmailExistsError(error: { code?: string; status?: number; message?: string } | null): boolean {
  if (!error) return false;
  const code = (error.code || '').toLowerCase();
  if (code === 'email_exists' || code === 'user_already_exists') return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('already been registered') || message.includes('already registered');
}

/** True when Supabase Auth rejected the password against its configured policy. */
export function isWeakPasswordError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (error.code || '').toLowerCase() === 'weak_password';
}
