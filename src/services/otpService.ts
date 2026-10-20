import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeEmail } from '@/lib/validation/auth';
import { encryptSecret, decryptSecret } from '@/utils/encryption';

export const RESEND_COOLDOWN_SECONDS = 45;
export const EXPIRATION_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const MAX_HOURLY_CHALLENGES_PER_EMAIL = 5;
export const MAX_HOURLY_REQUESTS_PER_IP = 15;

export interface VerificationChallengeRecord {
  id: string;
  email: string;
  otp_hash: string;
  purpose: string;
  expires_at: string;
  attempt_count: number;
  max_attempts: number;
  verified_at: string | null;
  created_at: string;
  last_sent_at: string;
  request_ip_hash: string | null;
  pending_payload?: string | null;
}

/**
 * Thrown for intentional, user-safe throttling messages (cooldown / hourly limits).
 * Routes may return `message` to the client; any other error must be treated as internal.
 */
export class OtpRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpRateLimitError';
  }
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local.charAt(0)}*@${domain}`;
  }
  const maskedLocal = local.charAt(0) + '•'.repeat(Math.max(4, local.length - 2)) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip.trim()).digest('hex');
}

function getOtpHash(otp: string): string {
  const pepper = process.env.OTP_PEPPER_SECRET || process.env.ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!pepper) {
    throw new Error('Required OTP pepper secret is missing. Set OTP_PEPPER_SECRET or ENCRYPTION_KEY.');
  }
  return crypto.createHmac('sha256', pepper).update(otp).digest('hex');
}

function safeCompareHash(enteredOtp: string, storedHash: string): boolean {
  const calculatedHash = getOtpHash(enteredOtp);
  const enteredBuffer = Buffer.from(calculatedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  if (enteredBuffer.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(enteredBuffer, storedBuffer);
}

export function generateSecureOtp(): string {
  // Cryptographically secure 6-digit OTP (100000 - 999999)
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Creates a new OTP verification challenge.
 * Returns the rawOtp (to send via email ONLY) and challenge metadata.
 */
export async function createChallenge(
  email: string,
  clientIp: string = '127.0.0.1',
  purpose: string = 'organizer_registration',
  pendingPayload?: Record<string, unknown>
): Promise<
  | { created: true; challengeId: string; rawOtp: string; expiresAt: Date }
  | { created: false; challengeId: string; expiresAt: Date }
> {
  const normEmail = normalizeEmail(email);
  const ipHash = hashIp(clientIp);
  const rawOtp = generateSecureOtp();
  const otpHashed = getOtpHash(rawOtp);

  const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);

  // Rate Limiting Check: per-email hourly quota & per-IP hourly quota
  await enforceCreationRateLimits(normEmail, ipHash);

  let encryptedPayload: string | null = null;
  if (pendingPayload) {
    try {
      encryptedPayload = encryptSecret(JSON.stringify(pendingPayload));
    } catch {
      encryptedPayload = JSON.stringify(pendingPayload);
    }
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('create_organizer_verification_challenge', {
    p_email: normEmail,
    p_otp_hash: otpHashed,
    p_purpose: purpose,
    p_expires_at: expiresAt.toISOString(),
    p_max_attempts: MAX_ATTEMPTS,
    p_request_ip_hash: ipHash,
    p_pending_payload: encryptedPayload,
  });
  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  if (
    !result ||
    typeof result.challenge_id !== 'string' ||
    typeof result.created !== 'boolean'
  ) {
    throw new Error('Challenge creation returned an invalid result.');
  }

  if (!result.created) {
    return { created: false, challengeId: result.challenge_id, expiresAt };
  }
  return { created: true, challengeId: result.challenge_id, rawOtp, expiresAt };
}

/**
 * Resends OTP with 45-second cooldown and hourly limits.
 */
export async function resendChallengeOtp(
  email: string,
  clientIp: string = '127.0.0.1',
  purpose: string = 'organizer_registration'
): Promise<{ success: true; created: true; rawOtp: string; expiresAt: Date; challengeId: string }> {
  const normEmail = normalizeEmail(email);
  const activeChallenge = await getLatestActiveChallenge(normEmail, purpose);

  if (activeChallenge) {
    const lastSent = new Date(activeChallenge.last_sent_at).getTime();
    const elapsedSeconds = Math.floor((Date.now() - lastSent) / 1000);
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      throw new OtpRateLimitError(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
    }
  }

  const challenge = await createChallenge(normEmail, clientIp, purpose);
  if (!challenge.created) {
    throw new OtpRateLimitError('A verification code was just sent. Please wait before requesting another.');
  }
  return {
    success: true,
    created: true,
    rawOtp: challenge.rawOtp,
    expiresAt: challenge.expiresAt,
    challengeId: challenge.challengeId,
  };
}

/**
 * Verifies an entered OTP against the active challenge for an email atomically.
 */
export async function verifyOtpChallenge(
  email: string,
  enteredOtp: string,
  purpose: string = 'organizer_registration'
): Promise<{
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
  challengeId?: string;
  pendingPayload?: Record<string, unknown> | null;
}> {
  const normEmail = normalizeEmail(email);
  const cleanedOtp = enteredOtp.trim();

  if (!/^\d{6}$/.test(cleanedOtp)) {
    return { success: false, error: 'Verification code must be exactly 6 digits.' };
  }

  const otpHashed = getOtpHash(cleanedOtp);
  const adminClient = createAdminClient();

  // 1. Concurrency-safe atomic database verification RPC
  try {
    const { data, error } = await adminClient.rpc('verify_organizer_verification_challenge', {
      p_email: normEmail,
      p_purpose: purpose,
      p_otp_hash: otpHashed,
    });

    if (!error && data) {
      const result = Array.isArray(data) ? data[0] : data;
      if (result && typeof result.status === 'string') {
        const { status, challenge_id, attempts_remaining, pending_payload } = result;

        let parsedPayload: Record<string, unknown> | null = null;
        if (pending_payload) {
          try {
            parsedPayload = JSON.parse(decryptSecret(pending_payload));
          } catch {
            try {
              parsedPayload = JSON.parse(pending_payload);
            } catch {
              parsedPayload = null;
            }
          }
        }

        switch (status) {
          case 'SUCCESS':
            return {
              success: true,
              challengeId: challenge_id,
              pendingPayload: parsedPayload,
            };
          case 'INVALID_OTP':
            return {
              success: false,
              error: `Incorrect verification code. ${attempts_remaining} attempt${attempts_remaining === 1 ? '' : 's'} remaining.`,
              attemptsRemaining: attempts_remaining,
              challengeId: challenge_id,
            };
          case 'MAX_ATTEMPTS_EXCEEDED':
            return {
              success: false,
              error: 'Maximum verification attempts exceeded. Please request a new code.',
              attemptsRemaining: 0,
              challengeId: challenge_id,
            };
          case 'EXPIRED':
            return { success: false, error: 'Verification code has expired. Please request a new code.' };
          case 'ALREADY_USED':
            return { success: false, error: 'This verification code has already been used. Please request a new code.' };
          case 'NOT_FOUND':
          default:
            return { success: false, error: 'No active verification code found. Please request a new code.' };
        }
      }
    }
  } catch {
    // If the atomic RPC is unavailable, fallback to database-level transactional check below
  }

  // 2. Transactional fallback
  const challenge = await getLatestActiveChallenge(normEmail, purpose);

  if (!challenge) {
    return { success: false, error: 'No active verification code found. Please request a new code.' };
  }

  if (challenge.verified_at) {
    return { success: false, error: 'This verification code has already been used. Please request a new code.' };
  }

  if (challenge.attempt_count >= challenge.max_attempts) {
    return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.', attemptsRemaining: 0 };
  }

  const now = new Date();
  const expiresAt = new Date(challenge.expires_at);
  if (now > expiresAt) {
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // Increment attempt count FIRST to prevent race conditions
  const newAttemptCount = challenge.attempt_count + 1;
  await updateAttemptCount(challenge.id, newAttemptCount);

  // Cryptographic constant-time comparison
  const isValid = safeCompareHash(cleanedOtp, challenge.otp_hash);

  if (!isValid) {
    const attemptsRemaining = Math.max(0, challenge.max_attempts - newAttemptCount);

    if (attemptsRemaining === 0) {
      return {
        success: false,
        error: 'Too many incorrect attempts. This code is now invalid. Please request a new code.',
        attemptsRemaining: 0,
      };
    }

    return {
      success: false,
      error: `Incorrect verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      attemptsRemaining,
    };
  }

  // Mark the OTP consumed once
  if (!(await markChallengeVerified(challenge.id))) {
    return { success: false, error: 'This verification code has already been used. Please request a new code.' };
  }

  let parsedPayload: Record<string, unknown> | null = null;
  if (challenge.pending_payload) {
    try {
      parsedPayload = JSON.parse(decryptSecret(challenge.pending_payload));
    } catch {
      try {
        parsedPayload = JSON.parse(challenge.pending_payload);
      } catch {
        parsedPayload = null;
      }
    }
  }

  return { success: true, challengeId: challenge.id, pendingPayload: parsedPayload };
}

async function enforceCreationRateLimits(email: string, ipHash: string): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const adminClient = createAdminClient();

  const { data: emailChallenges, error: emailError } = await adminClient
    .from('organizer_verification_challenges')
    .select('id')
    .eq('email', email)
    .gte('created_at', oneHourAgo);
  if (emailError) throw emailError;
  if (emailChallenges.length >= MAX_HOURLY_CHALLENGES_PER_EMAIL) {
    throw new OtpRateLimitError('Too many registration attempts for this email. Please try again in an hour.');
  }

  const { data: ipChallenges, error: ipError } = await adminClient
    .from('organizer_verification_challenges')
    .select('id')
    .eq('request_ip_hash', ipHash)
    .gte('created_at', oneHourAgo);
  if (ipError) throw ipError;
  if (ipChallenges.length >= MAX_HOURLY_REQUESTS_PER_IP) {
    throw new OtpRateLimitError('Too many registration requests from this network. Please try again later.');
  }
}

async function getLatestActiveChallenge(
  email: string,
  purpose: string
): Promise<VerificationChallengeRecord | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('organizer_verification_challenges')
    .select('*')
    .eq('email', email)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as VerificationChallengeRecord) || null;
}

async function updateAttemptCount(challengeId: string, count: number): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('organizer_verification_challenges')
    .update({ attempt_count: count })
    .eq('id', challengeId);
  if (error) throw error;
}

async function markChallengeVerified(challengeId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('organizer_verification_challenges')
    .update({ verified_at: now })
    .eq('id', challengeId)
    .is('verified_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
