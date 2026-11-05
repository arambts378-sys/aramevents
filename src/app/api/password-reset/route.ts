import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OtpRateLimitError, createChallenge } from '@/services/otpService';
import { describePlatformSmtp } from '@/services/organizerMailer';
import { sendPasswordResetLink } from '@/services/passwordReset';
import { normalizeEmail, validateEmail } from '@/lib/validation/auth';
import { getTrustedClientIp } from '@/lib/security/clientIp';

// Identical whether or not the email has an account, or a send was skipped by the cooldown.
const GENERIC_SUCCESS = { success: true };

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const emailError = validateEmail(body?.email);
  if (emailError) return NextResponse.json({ error: emailError }, { status: 400 });
  const email = normalizeEmail(body.email as string);

  try {
    // Supabase no longer sends this email, so its rate limits no longer apply. A challenge row
    // gives the same database-backed cooldown and hourly limits as sign-up codes, and applies
    // equally to unknown emails. Its code is never sent or checked.
    const challenge = await createChallenge(email, getTrustedClientIp(req), 'password_reset');
    if (!challenge.created) return NextResponse.json(GENERIC_SUCCESS);

    // The request's own origin, as the browser used before: the app URL may be another host,
    // and Supabase only honours redirects on its allow list.
    await sendPasswordResetLink(createAdminClient(), email, `${req.nextUrl.origin}/reset-password`);
    return NextResponse.json(GENERIC_SUCCESS);
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json({ error: 'Too many reset requests. Please try again in an hour.' }, { status: 429 });
    }
    // Mail errors carry no credentials and are the only clue to misconfiguration.
    console.error('[password-reset] send failed:', (err as Error)?.message, await describePlatformSmtp());
    return NextResponse.json(
      { error: 'We could not send reset instructions right now. Please try again in a minute.' },
      { status: 500 }
    );
  }
}
