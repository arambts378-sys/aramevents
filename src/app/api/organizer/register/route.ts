import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  OtpRateLimitError,
  createChallenge,
  maskEmail,
} from '@/services/otpService';
import {
  sendExistingAccountNoticeEmail,
  sendOrganizerVerificationEmail,
} from '@/services/organizerMailer';
import {
  findAuthUserByEmail,
  isEmailExistsError,
  isWeakPasswordError,
} from '@/lib/auth/adminUsers';
import { validateRegistration } from '@/lib/validation/auth';
import { getActivityCorrelationId, recordPlatformActivity } from '@/services/platformActivity.server';

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

/** Log only non-sensitive error attributes (never request bodies / passwords). */
function logAuthError(context: string, err: unknown) {
  const e = err as { name?: string; code?: string; status?: number } | null;
  console.error(`[organizer/register] ${context}`, {
    name: e?.name,
    code: e?.code,
    status: e?.status,
  });
}

// Identical for new accounts, pending (unverified) accounts, and already-verified accounts,
// so this public endpoint cannot be used to discover which emails are registered.
const GENERIC_SUCCESS_MESSAGE =
  'If this address is awaiting verification, check your email for a code. If you already have an account, sign in or reset your password.';

export async function POST(req: NextRequest) {
  let activityActorId: string | null = null;
  let createdNewAccount = false;
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // 1. Server-side validation (client validation is only a usability aid)
    const validation = validateRegistration({
      fullName: body?.fullName,
      organizationName: body?.organizationName,
      email: body?.email,
      phoneNumber: body?.phoneNumber,
      password: body?.password,
      confirmPassword: body?.confirmPassword,
    });

    if (!validation.valid || !validation.values) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fieldErrors: validation.fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, organizationName, email, phone, password } = validation.values;
    const clientIp = getClientIp(req);
    const adminClient = createAdminClient();

    // 2. Create the Auth user. Supabase Auth's unique-email constraint is the source of truth,
    //    which also makes simultaneous submissions safe: exactly one createUser can succeed.
    //    The handle_new_user trigger provisions profile + workspace + owner membership atomically
    //    with the auth.users insert, so a failed/retried registration cannot duplicate them.
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        organization_name: organizationName,
        phone,
      },
    });

    let accountState: 'new' | 'pending' | 'verified';

    if (createError || !created?.user) {
      if (isWeakPasswordError(createError)) {
        return NextResponse.json(
          {
            error: 'Please correct the highlighted fields.',
            fieldErrors: {
              password:
                'This password is too weak or has appeared in a data breach. Please choose a different one.',
            },
          },
          { status: 400 }
        );
      }

      if (!isEmailExistsError(createError)) {
        await recordPlatformActivity({
          action: 'auth.registration_failed',
          outcome: 'failure',
          errorCode: 'AUTH_REGISTRATION_FAILED',
          correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
        });
        logAuthError('createUser failed', createError);
        return NextResponse.json(
          { error: 'Unable to create your account right now. Please try again.' },
          { status: 500 }
        );
      }

      // Email already registered: never modify the existing account (password, metadata,
      // workspace). Only decide which email to send.
      const existing = await findAuthUserByEmail(adminClient, email);
      if (!existing) {
        await recordPlatformActivity({
          action: 'auth.registration_failed',
          outcome: 'failure',
          errorCode: 'AUTH_REGISTRATION_FAILED',
          correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
        });
        logAuthError('email_exists reported but user not found', null);
        return NextResponse.json(
          { error: 'Unable to create your account right now. Please try again.' },
          { status: 500 }
        );
      }
      accountState = existing.email_confirmed_at ? 'verified' : 'pending';
    } else {
      accountState = 'new';
      activityActorId = created.user.id;
      createdNewAccount = true;
    }

    // 3. Challenge + email. Challenge creation is serialized in the database so concurrent
    // requests cannot replace one another's code.
    const challenge = await createChallenge(email, clientIp, 'organizer_registration');
    if (challenge.created) {

      try {
        if (accountState === 'verified') {
          await sendExistingAccountNoticeEmail(email);
        } else {
          await sendOrganizerVerificationEmail(email, challenge.rawOtp, 10);
        }
      } catch (mailErr) {
        await recordPlatformActivity({
          actorUserId: activityActorId,
          action: 'auth.registration_failed',
          outcome: 'failure',
          errorCode: 'AUTH_EMAIL_DELIVERY_FAILED',
          correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
        });
        logAuthError('email delivery failed', mailErr);
        return NextResponse.json(
          { error: 'We could not send the verification email. Please try again.' },
          { status: 500 }
        );
      }
    }

    if (createdNewAccount) {
      await recordPlatformActivity({
        actorUserId: activityActorId,
        action: 'auth.registration_succeeded',
        outcome: 'success',
        correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
      });
    }
    return NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS_MESSAGE,
      email: maskEmail(email),
    });
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    await recordPlatformActivity({
      actorUserId: activityActorId,
      action: 'auth.registration_failed',
      outcome: 'failure',
      errorCode: 'AUTH_REGISTRATION_FAILED',
      correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
    });
    logAuthError('unexpected error', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
