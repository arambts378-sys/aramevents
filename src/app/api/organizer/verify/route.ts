import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { normalizeEmail, verifyOtpChallenge } from '@/services/otpService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required.' },
        { status: 400 }
      );
    }

    const normEmail = normalizeEmail(email);
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { error: 'Verification code must be exactly 6 digits.' },
        { status: 400 }
      );
    }

    // 1. Verify Challenge Cryptographically
    const verification = await verifyOtpChallenge(normEmail, cleanOtp, 'organizer_registration');

    if (!verification.success) {
      return NextResponse.json(
        {
          error: verification.error || 'Invalid verification code.',
          attemptsRemaining: verification.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    // 2. Activate Supabase Auth User
    const adminClient = createAdminClient();
    const { data: userListData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error('Failed to query users during verification:', listError);
      return NextResponse.json(
        { error: 'Verification succeeded but failed to activate account. Please contact support.' },
        { status: 500 }
      );
    }

    const user = userListData?.users.find((u) => u.email?.toLowerCase() === normEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'Account record not found. Please register again.' },
        { status: 404 }
      );
    }

    // Confirm email in Supabase Auth
    const { error: confirmError } = await adminClient.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (confirmError) {
      console.error('Failed to confirm email in Supabase Auth:', confirmError);
      return NextResponse.json(
        { error: 'Failed to activate account in authentication service.' },
        { status: 500 }
      );
    }

    // 3. Ensure Profile, Workspace and OWNER Membership Provisioning
    const fullName = user.user_metadata?.full_name || 'Organizer';
    const orgName = user.user_metadata?.organization_name || `${fullName}'s Organization`;

    // Ensure Profile exists and is updated
    await adminClient.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      avatar_url: user.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    });

    // Ensure Workspace exists
    const { data: existingWorkspaces } = await adminClient
      .from('workspaces')
      .select('id, name')
      .eq('owner_id', user.id)
      .limit(1);

    let workspaceId: string;

    if (existingWorkspaces && existingWorkspaces.length > 0) {
      workspaceId = existingWorkspaces[0].id;
      // Update workspace name to the registered Organization Name
      await adminClient
        .from('workspaces')
        .update({
          name: orgName,
          email: normEmail,
        })
        .eq('id', workspaceId);
    } else {
      // Create new workspace if trigger did not create it
      workspaceId = crypto.randomUUID();
      const slug = `ws-${crypto.randomBytes(4).toString('hex')}`;

      const { data: newWs, error: wsError } = await adminClient
        .from('workspaces')
        .insert({
          id: workspaceId,
          name: orgName,
          slug,
          owner_id: user.id,
          email: normEmail,
        })
        .select('id')
        .single();

      if (!wsError && newWs) {
        workspaceId = newWs.id;
      }
    }

    // Ensure OWNER Role Membership in workspace_members
    const { data: ownerRole } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', 'workspace_owner')
      .limit(1)
      .maybeSingle();

    if (ownerRole?.id) {
      const { data: existingMember } = await adminClient
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!existingMember) {
        await adminClient.from('workspace_members').insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role_id: ownerRole.id,
        });
      }
    }

    // 4. Establish Authenticated Session Cookies
    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: normEmail,
      });

      if (!linkError && linkData?.properties?.hashed_token) {
        const serverSupabase = await createServerSupabaseClient();
        await serverSupabase.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: (linkData.properties.verification_type as any) || 'magiclink',
        });
      }
    } catch (sessionErr) {
      console.warn('Could not auto-generate session cookies via magic link:', sessionErr);
      // Even if server session cookie exchange has an issue, user account is verified
      // so user can authenticate or will be redirected.
    }

    return NextResponse.json({
      success: true,
      message: 'Account verified successfully.',
      redirect: '/app',
    });
  } catch (err: any) {
    console.error('Error during OTP verification:', err);
    return NextResponse.json(
      { error: err?.message || 'An unexpected error occurred during verification.' },
      { status: 500 }
    );
  }
}
