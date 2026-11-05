import {
  mapLoginError,
  normalizeEmail,
  type AuthErrorLike,
  type LoginFailure,
} from '@/lib/validation/auth';

interface LoginUser {
  email_confirmed_at?: string | null;
}

interface LoginCallbacks {
  signIn: (credentials: { email: string; password: string }) => Promise<{ error: AuthErrorLike | null }>;
  getUser: () => Promise<{
    data: { user: LoginUser | null };
    error: AuthErrorLike | null;
  }>;
}

export type LoginAttempt =
  | { kind: 'authenticated'; redirectTo: '/app' }
  | { kind: 'unverified'; redirectTo: string }
  | { kind: 'error'; failure: LoginFailure };

export async function authenticateWithEmailPassword(
  email: string,
  password: string,
  callbacks: LoginCallbacks
): Promise<LoginAttempt> {
  const normalizedEmail = normalizeEmail(email);
  const { error: signInError } = await callbacks.signIn({
    email: normalizedEmail,
    password,
  });
  if (signInError) return { kind: 'error', failure: mapLoginError(signInError) };

  const { data, error: userError } = await callbacks.getUser();
  if (userError) return { kind: 'error', failure: mapLoginError(userError) };
  if (!data.user) {
    return { kind: 'error', failure: mapLoginError(null) };
  }

  if (!data.user.email_confirmed_at) {
    return {
      kind: 'unverified',
      redirectTo: `/organizer/verify?email=${encodeURIComponent(normalizedEmail)}&sent=0`,
    };
  }
  return { kind: 'authenticated', redirectTo: '/app' };
}
