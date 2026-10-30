import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import {
  findAuthUserByEmail,
  isEmailExistsError,
  isWeakPasswordError,
} from '@/lib/auth/adminUsers';
import { ProvisioningError, ensureOrganizerProvisioned } from '@/lib/auth/provisionOrganizer';
import { validateRegistration } from '@/lib/validation/auth';
import { getActivityCorrelationId, recordPlatformActivity } from '@/services/platformActivity.server';

/** Log only non-sensitive error attributes (never request bodies / passwords). */
function logAuthError(context: string, err: unknown) {
  const e = err as { name?: string; code?: string; status?: number } | null;
  console.error(`[organizer/register] ${context}`, {
    name: e?.name,
    code: e?.code,
    status: e?.status,
  });
}

const ACCOUNT_EXISTS_MESSAGE =
  'An account with this email already exists. Sign in, or reset your password if you have forgotten it.';

/**
 * Creates an organizer account and its organization, then signs the organizer in.
 * There is no email verification step: the address is trusted as entered.
 */
export async function POST(req: NextRequest) {
  let activityActorId: string | null = null;
  const correlationId = () => getActivityCorrelationId(req.headers.get('x-request-id'));
  const failed = async () =>
    recordPlatformActivity({
      actorUserId: activityActorId,
      action: 'auth.registration_failed',
      outcome: 'failure',
      errorCode: 'AUTH_REGISTRATION_FAILED',
      correlationId: correlationId(),
    });

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
    const metadata = { full_name: fullName, organization_name: organizationName, phone };
    const adminClient = createAdminClient();

    // 2. Create the Auth user. Supabase Auth's unique-email constraint is the source of truth,
    //    which also makes simultaneous submissions safe: exactly one createUser can succeed.
    //    The handle_new_user trigger provisions profile + workspace + owner membership atomically
    //    with the auth.users insert. The user stays unconfirmed until provisioning has finished,
    //    so a failure here leaves an account that the next attempt can complete.
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: metadata,
    });

    let userId: string;
    let userMetadata: Record<string, unknown>;

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
        await failed();
        logAuthError('createUser failed', createError);
        return NextResponse.json(
          { error: 'Unable to create your account right now. Please try again.' },
          { status: 500 }
        );
      }

      const existing = await findAuthUserByEmail(adminClient, email);
      if (!existing) {
        await failed();
        logAuthError('email_exists reported but user not found', null);
        return NextResponse.json(
          { error: 'Unable to create your account right now. Please try again.' },
          { status: 500 }
        );
      }

      // A finished account is never modified by an unauthenticated request.
      if (existing.email_confirmed_at) {
        return NextResponse.json(
          { error: ACCOUNT_EXISTS_MESSAGE, fieldErrors: { email: ACCOUNT_EXISTS_MESSAGE } },
          { status: 409 }
        );
      }

      // An unfinished account (an earlier attempt that failed part-way, or one left waiting
      // for the email code this flow used to require) has never been usable, so this
      // registration completes it with the details just entered.
      userId = existing.id;
      userMetadata = { ...existing.user_metadata, ...metadata };
    } else {
      userId = created.user.id;
      userMetadata = metadata;
    }
    activityActorId = userId;

    // 3. Idempotent provisioning BEFORE confirming, so a failure leaves the account
    //    unfinished and retryable instead of "active but without a workspace".
    try {
      await ensureOrganizerProvisioned(adminClient, { id: userId, user_metadata: userMetadata }, email);
    } catch (provErr) {
      if (provErr instanceof ProvisioningError) {
        await failed();
        return NextResponse.json(
          { error: 'We could not finish setting up your organization. Please try again.' },
          { status: 500 }
        );
      }
      throw provErr;
    }

    // 4. Activate the account, binding the password and details from this request.
    const { error: confirmError } = await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
      password,
      user_metadata: userMetadata,
    });
    if (confirmError) {
      await failed();
      logAuthError('account activation failed', confirmError);
      return NextResponse.json(
        { error: 'Unable to create your account right now. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Establish authenticated session cookies.
    let signedIn = false;
    try {
      const serverSupabase = await createServerSupabaseClient();
      const { error: signInError } = await serverSupabase.auth.signInWithPassword({ email, password });
      if (signInError) logAuthError('sign-in after registration failed', signInError);
      else signedIn = true;
    } catch (sessionErr) {
      logAuthError('could not establish session after registration', sessionErr);
    }

    await recordPlatformActivity({
      actorUserId: userId,
      action: 'auth.registration_succeeded',
      outcome: 'success',
      correlationId: correlationId(),
    });
    // The account is active either way; without a session the organizer signs in manually.
    return NextResponse.json({
      success: true,
      message: 'Your organizer account is ready.',
      redirect: signedIn ? '/app' : '/login',
    });
  } catch (err) {
    await failed();
    logAuthError('unexpected error', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
