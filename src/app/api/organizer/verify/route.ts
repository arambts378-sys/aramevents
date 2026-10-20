import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { OtpRateLimitError, verifyOtpChallenge } from '@/services/otpService';
import { findAuthUserByEmail } from '@/lib/auth/adminUsers';
import { normalizeEmail, normalizeIndianMobile, validateEmail } from '@/lib/validation/auth';
import { getActivityCorrelationId, recordPlatformActivity } from '@/services/platformActivity.server';

type AdminClient = ReturnType<typeof createAdminClient>;

class ProvisioningError extends Error {}

function logError(context: string, err: unknown) {
  const e = err as { name?: string; code?: string; status?: number } | null;
  console.error(`[organizer/verify] ${context}`, { name: e?.name, code: e?.code, status: e?.status });
}

/**
 * Idempotently ensures profile, workspace and OWNER membership exist.
 *
 * The auth.users trigger normally created all three when the account was registered, so in the
 * normal case this only refreshes names. It never inserts a second workspace for an owner who
 * already has one, and membership uses an upsert on UNIQUE(workspace_id, user_id).
 */
async function ensureProvisioned(
  adminClient: AdminClient,
  user: { id: string; user_metadata?: Record<string, unknown> },
  normEmail: string
) {
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : 'Organizer';
  const orgName =
    typeof metadata.organization_name === 'string' && metadata.organization_name.trim()
      ? metadata.organization_name.trim()
      : `${fullName}'s Organization`;
  const profile: Record<string, string | null> = {
    id: user.id,
    full_name: fullName,
    avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    updated_at: new Date().toISOString(),
  };
  if (typeof metadata.phone === 'string' && metadata.phone.length > 0) {
    const phone = normalizeIndianMobile(metadata.phone);
    if (!phone.valid || !phone.e164) throw new ProvisioningError('phone');
    profile.phone = phone.e164;
  }

  const { error: profileError } = await adminClient.from('profiles').upsert(profile);
  if (profileError) {
    logError('profile upsert failed', profileError);
    throw new ProvisioningError('profile');
  }

  const findWorkspace = async () => {
    const { data, error } = await adminClient
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) {
      logError('workspace lookup failed', error);
      throw new ProvisioningError('workspace');
    }
    return data && data.length > 0 ? (data[0].id as string) : null;
  };

  let workspaceId = await findWorkspace();

  if (workspaceId) {
    // Name the pre-created workspace after the registered organization before confirming email.
    const { error: renameError } = await adminClient
      .from('workspaces')
      .update({ name: orgName, email: normEmail })
      .eq('id', workspaceId);
    if (renameError) {
      logError('workspace rename failed', renameError);
      throw new ProvisioningError('workspace');
    }
  } else {
    // Fallback only when the trigger did not create one.
    const { error: insertError } = await adminClient.from('workspaces').insert({
      id: crypto.randomUUID(),
      name: orgName,
      slug: `ws-${crypto.randomBytes(4).toString('hex')}`,
      owner_id: user.id,
      email: normEmail,
    });
    if (insertError) logError('workspace insert failed', insertError);

    // Re-read: if a concurrent request created it first we adopt that one.
    workspaceId = await findWorkspace();
    if (!workspaceId) throw new ProvisioningError('workspace');
  }

  const { data: ownerRole, error: roleError } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'workspace_owner')
    .limit(1)
    .maybeSingle();

  if (roleError) {
    logError('owner role lookup failed', roleError);
    throw new ProvisioningError('role');
  }
  if (ownerRole?.id) {
    const { error: memberError } = await adminClient.from('workspace_members').upsert(
      { workspace_id: workspaceId, user_id: user.id, role_id: ownerRole.id },
      { onConflict: 'workspace_id,user_id', ignoreDuplicates: true }
    );
    if (memberError) {
      logError('membership upsert failed', memberError);
      throw new ProvisioningError('membership');
    }
  } else {
    console.error('[organizer/verify] workspace_owner role not found');
    throw new ProvisioningError('role');
  }
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
      await ensureProvisioned(adminClient, effectiveUser, normEmail);
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
