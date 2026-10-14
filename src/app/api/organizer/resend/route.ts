import { NextRequest, NextResponse } from 'next/server';
import { maskEmail, normalizeEmail, resendChallengeOtp } from '@/services/otpService';
import { sendOrganizerVerificationEmail } from '@/services/organizerMailer';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const normEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(req);

    // Resend OTP challenge with cooldown & hourly rate limit checks
    const { rawOtp, expiresAt } = await resendChallengeOtp(
      normEmail,
      clientIp,
      'organizer_registration'
    );

    await sendOrganizerVerificationEmail(normEmail, rawOtp, 10);

    return NextResponse.json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      email: maskEmail(normEmail),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('Error during OTP resend:', err);
    const errorMessage = err?.message || 'Failed to resend verification code.';
    const isCooldownOrRateLimit =
      errorMessage.toLowerCase().includes('wait') ||
      errorMessage.toLowerCase().includes('too many');

    return NextResponse.json(
      { error: errorMessage },
      { status: isCooldownOrRateLimit ? 429 : 500 }
    );
  }
}
