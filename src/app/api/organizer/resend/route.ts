import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OtpRateLimitError, maskEmail, resendChallengeOtp } from '@/services/otpService';
import {
  sendExistingAccountNoticeEmail,
  sendOrganizerVerificationEmail,
} from '@/services/organizerMailer';
import { findAuthUserByEmail } from '@/lib/auth/adminUsers';
import { normalizeEmail, validateEmail } from '@/lib/validation/auth';
import { getTrustedClientIp } from '@/lib/security/clientIp';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const emailError = validateEmail(body?.email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const normEmail = normalizeEmail(body.email as string);
    const clientIp = getTrustedClientIp(req);

    // Cooldown + hourly limits apply identically whether or not the email has an account,
    // so throttling responses cannot be used to probe for registered emails.
    const { rawOtp, created } = await resendChallengeOtp(normEmail, clientIp, 'organizer_registration');

    // Decide what (if anything) to send. The HTTP response is identical in every case.
    const user = await findAuthUserByEmail(createAdminClient(), normEmail);

    try {
      if (created && user && !user.email_confirmed_at) {
        await sendOrganizerVerificationEmail(normEmail, rawOtp, 10);
      } else if (created && user && user.email_confirmed_at) {
        // Already verified: no code is issued for sign-in; point the owner to the login page.
        await sendExistingAccountNoticeEmail(normEmail);
      }
      // No account: send nothing (prevents using this endpoint to spam arbitrary addresses).
    } catch (mailErr) {
      const e = mailErr as { name?: string; code?: string } | null;
      console.error('[organizer/resend] email delivery failed', {
        name: e?.name,
        code: e?.code,
        message: (mailErr as Error)?.message,
      });
      return NextResponse.json(
        { error: 'We could not send the verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If this email is awaiting verification, a new code has been sent.',
      email: maskEmail(normEmail),
    });
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const e = err as { name?: string; code?: string } | null;
    console.error('[organizer/resend] unexpected error', { name: e?.name, code: e?.code });
    return NextResponse.json(
      { error: 'Failed to resend verification code. Please try again.' },
      { status: 500 }
    );
  }
}
