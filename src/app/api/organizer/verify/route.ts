import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { OtpRateLimitError, clearPendingPayloads, verifyOtpChallenge } from '@/services/otpService';
import { findAuthUserByEmail } from '@/lib/auth/adminUsers';
import { ProvisioningError, ensureOrganizerProvisioned } from '@/lib/auth/provisionOrganizer';
import { normalizeEmail, validateEmail } from '@/lib/validation/auth';
import { getActivityCorrelationId, recordPlatformActivity } from '@/services/platformActivity.server';

function logError(context: string, err: unknown) {
  const e = err as { name?: string; code?: string; status?: number } | null;
  console.error(`[organizer/verify] ${context}`, { name: e?.name, code: e?.code, status: e?.status });
}

export async function POST(req: NextRequest) {
  let activityActorId: string | null = null;
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

    const otp = body?.otp;
    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const normEmail = normalizeEmail(body.email as string);
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { error: 'Verification code must be exactly 6 digits.' },
        { status: 400 }
      );
    }

    // 1. Verify challenge cryptographically (unchanged OTP requirements)
    const verification = await verifyOtpChallenge(normEmail, cleanOtp, 'organizer_registration');

    if (!verification.success) {
      await recordPlatformActivity({
        action: 'auth.verification_failed',
        outcome: 'failure',
        errorCode: 'AUTH_VERIFICATION_FAILED',
        correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
      });
      return NextResponse.json(
        {
          error: verification.error || 'Invalid verification code.',
          attemptsRemaining: verification.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    // 2. Locate the pending Auth user
    const adminClient = createAdminClient();
    const user = await findAuthUserByEmail(adminClient, normEmail);

    if (!user) {
      await recordPlatformActivity({
        action: 'auth.verification_failed',
        outcome: 'failure',
        errorCode: 'AUTH_VERIFICATION_FAILED',
        correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
      });
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please request a new code.' },
        { status: 400 }
      );
    }
    activityActorId = user.id;

    // An already-verified account must not be re-provisioned or silently signed in via OTP.
    if (user.email_confirmed_at) {
      await recordPlatformActivity({
        actorUserId: user.id,
        action: 'auth.verification_failed',
        outcome: 'failure',
        errorCode: 'AUTH_VERIFICATION_FAILED',
        correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
      });
      return NextResponse.json(
        { error: 'This email is already verified. Please sign in.' },
        { status: 400 }
      );
    }

    // 3. Idempotent provisioning BEFORE confirming, so a failure leaves the account pending
    //    and retryable instead of "verified but without a workspace".
    const pending = (verification.pendingPayload || {}) as {
      fullName?: string;
      organizationName?: string;
      phone?: string;
      password?: string;
    };
    const effectiveMetadata = {
      ...user.user_metadata,
      ...(pending.fullName ? { full_name: pending.fullName } : {}),
      ...(pending.organizationName ? { organization_name: pending.organizationName } : {}),
      ...(pending.phone ? { phone: pending.phone } : {}),
    };
    const effectiveUser = {
      ...user,
      user_metadata: effectiveMetadata,
    };

    try {
      await ensureOrganizerProvisioned(adminClient, effectiveUser, normEmail);
    } catch (provErr) {
      if (provErr instanceof ProvisioningError) {
        await recordPlatformActivity({
          actorUserId: user.id,
          action: 'auth.verification_failed',
          outcome: 'failure',
          errorCode: 'AUTH_VERIFICATION_FAILED',
          correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
        });
        return NextResponse.json(
          { error: 'We could not finish setting up your workspace. Please request a new code and try again.' },
          { status: 500 }
        );
      }
      throw provErr;
    }

    // 4. Confirm email in Supabase Auth and bind verified password and metadata (H6)
    const updateAttrs: {
      email_confirm: boolean;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {
      email_confirm: true,
      user_metadata: effectiveMetadata,
    };
    if (typeof pending.password === 'string' && pending.password.length > 0) {
      updateAttrs.password = pending.password;
    }

    const { error: confirmError } = await adminClient.auth.admin.updateUserById(user.id, updateAttrs);

    if (confirmError) {
      await recordPlatformActivity({
        actorUserId: user.id,
        action: 'auth.verification_failed',
        outcome: 'failure',
        errorCode: 'AUTH_VERIFICATION_FAILED',
        correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
      });
      logError('email confirmation failed', confirmError);
      return NextResponse.json(
        { error: 'We could not activate your account. Please request a new code and try again.' },
        { status: 500 }
      );
    }

    // The account now holds these details, so the encrypted copy must not outlive it.
    try {
      await clearPendingPayloads(normEmail);
    } catch (clearErr) {
      logError('could not clear the pending payload', clearErr);
    }

    // 5. Establish authenticated session cookies
    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: normEmail,
      });

      if (!linkError && linkData?.properties?.hashed_token) {
        const serverSupabase = await createServerSupabaseClient();
        await serverSupabase.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        });
      }
    } catch (sessionErr) {
      logError('could not establish session after verification', sessionErr);
      // The account is verified, so the user can still sign in manually.
    }

    await recordPlatformActivity({
      actorUserId: user.id,
      action: 'auth.verification_succeeded',
      outcome: 'success',
      correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
    });
    return NextResponse.json({
      success: true,
      message: 'Account verified successfully.',
      redirect: '/app',
    });
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    await recordPlatformActivity({
      actorUserId: activityActorId,
      action: 'auth.verification_failed',
      outcome: 'failure',
      errorCode: 'AUTH_VERIFICATION_FAILED',
      correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
    });
    logError('unexpected error', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during verification. Please try again.' },
      { status: 500 }
    );
  }
}
