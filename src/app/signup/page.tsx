import { redirect } from 'next/navigation';

/**
 * The legacy /signup page called supabase.auth.signUp() directly from the browser, which
 * bypassed organizer email-OTP verification, the mandatory mobile number, and server-side
 * validation (and could mark users confirmed immediately if the project had email
 * confirmation turned off). All new accounts now go through the single verified flow.
 */
export default function SignUpPage() {
  redirect('/organizer/register');
}
