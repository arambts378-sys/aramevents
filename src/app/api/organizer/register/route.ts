import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createChallenge, maskEmail, normalizeEmail } from '@/services/otpService';
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
    const { fullName, organizationName, email, phoneNumber, password, confirmPassword } = body;

    // 1. Server-side Input Validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Full name is required and must be at least 2 characters.' },
        { status: 400 }
      );
    }
    if (fullName.trim().length > 100) {
      return NextResponse.json(
        { error: 'Full name must not exceed 100 characters.' },
        { status: 400 }
      );
    }

    if (!organizationName || typeof organizationName !== 'string' || organizationName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Organization name is required and must be at least 2 characters.' },
        { status: 400 }
      );
    }
    if (organizationName.trim().length > 100) {
      return NextResponse.json(
        { error: 'Organization name must not exceed 100 characters.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const normEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normEmail) || normEmail.length > 255) {
      return NextResponse.json(
        { error: 'Please provide a valid work email address.' },
        { status: 400 }
      );
    }

    if (phoneNumber && typeof phoneNumber === 'string' && phoneNumber.trim().length > 25) {
      return NextResponse.json(
        { error: 'Phone number cannot exceed 25 characters.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }
    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Password cannot exceed 128 characters.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(req);
    const adminClient = createAdminClient();

    // 2. Check if user already exists in Supabase Auth
    // Use listUsers pagination to search
    const { data: userListData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error('Failed to query users from Supabase Auth:', listError);
      return NextResponse.json(
        { error: 'Unable to process registration at this time. Please try again.' },
        { status: 500 }
      );
    }

    const existingUser = userListData?.users.find(
      (u) => u.email?.toLowerCase() === normEmail
    );

    if (existingUser) {
      // If user is already confirmed, protect against enumeration by returning generic message
      if (existingUser.email_confirmed_at) {
        return NextResponse.json({
          success: true,
          message: 'If the information is valid, a verification code has been sent to your email.',
          email: maskEmail(normEmail),
          existingConfirmed: true,
        });
      }

      // If user exists but is unconfirmed, update user credentials and metadata
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          user_metadata: {
            full_name: fullName.trim(),
            organization_name: organizationName.trim(),
            phone: phoneNumber ? phoneNumber.trim() : null,
          },
        }
      );

      if (updateAuthError) {
        console.error('Failed to update unconfirmed auth user:', updateAuthError);
        return NextResponse.json(
          { error: 'Unable to process registration. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Create new unconfirmed Supabase Auth user
      const { data: newUser, error: createAuthError } = await adminClient.auth.admin.createUser({
        email: normEmail,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName.trim(),
          organization_name: organizationName.trim(),
          phone: phoneNumber ? phoneNumber.trim() : null,
        },
      });

      if (createAuthError || !newUser?.user) {
        console.error('Failed to create auth user:', createAuthError);
        return NextResponse.json(
          { error: 'Unable to create organizer account. Please check your details and try again.' },
          { status: 400 }
        );
      }
    }

    // 3. Create Verification Challenge & Send Email OTP
    const { rawOtp, expiresAt } = await createChallenge(normEmail, clientIp, 'organizer_registration');

    await sendOrganizerVerificationEmail(normEmail, rawOtp, 10);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
      email: maskEmail(normEmail),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('Error during organizer registration:', err);
    // Rate limit or unexpected errors
    const errorMessage = err?.message || 'An unexpected error occurred. Please try again.';
    const isRateLimit = errorMessage.toLowerCase().includes('too many') || errorMessage.toLowerCase().includes('wait');
    return NextResponse.json(
      { error: errorMessage },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
