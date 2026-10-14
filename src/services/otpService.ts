import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

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
}

// In-memory fallback cache in case DB table is not yet provisioned in remote instance
const memoryChallengeStore = new Map<string, VerificationChallengeRecord>();

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  const pepper = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY || 'arambts-otp-secret-salt';
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
  purpose: string = 'organizer_registration'
): Promise<{ challengeId: string; rawOtp: string; expiresAt: Date }> {
  const normEmail = normalizeEmail(email);
  const ipHash = hashIp(clientIp);
  const rawOtp = generateSecureOtp();
  const otpHashed = getOtpHash(rawOtp);

  const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);
  const now = new Date();

  // Rate Limiting Check: per-email hourly quota & per-IP hourly quota
  await enforceCreationRateLimits(normEmail, ipHash);

  const adminClient = createAdminClient();

  const newRecord = {
    id: crypto.randomUUID(),
    email: normEmail,
    otp_hash: otpHashed,
    purpose,
    expires_at: expiresAt.toISOString(),
    attempt_count: 0,
    max_attempts: MAX_ATTEMPTS,
    verified_at: null,
    created_at: now.toISOString(),
    last_sent_at: now.toISOString(),
    request_ip_hash: ipHash,
  };

  try {
    const { data, error } = await adminClient
      .from('organizer_verification_challenges')
      .insert([newRecord])
      .select('id')
      .single();

    if (error) {
      // If table doesn't exist yet on remote database (PGRST205), fallback to memory
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        memoryChallengeStore.set(newRecord.id, newRecord);
        return { challengeId: newRecord.id, rawOtp, expiresAt };
      }
      throw new Error(`Failed to create verification challenge: ${error.message}`);
    }

    return { challengeId: data.id, rawOtp, expiresAt };
  } catch (err: any) {
    if (err?.message?.includes('schema cache') || err?.code === 'PGRST205') {
      memoryChallengeStore.set(newRecord.id, newRecord);
      return { challengeId: newRecord.id, rawOtp, expiresAt };
    }
    throw err;
  }
}

/**
 * Resends OTP with 45-second cooldown and hourly limits.
 */
export async function resendChallengeOtp(
  email: string,
  clientIp: string = '127.0.0.1',
  purpose: string = 'organizer_registration'
): Promise<{ success: boolean; rawOtp: string; expiresAt: Date; challengeId: string }> {
  const normEmail = normalizeEmail(email);
  const ipHash = hashIp(clientIp);

  // Retrieve active challenge to verify cooldown
  const activeChallenge = await getLatestActiveChallenge(normEmail, purpose);

  if (activeChallenge) {
    const lastSent = new Date(activeChallenge.last_sent_at).getTime();
    const elapsedSeconds = Math.floor((Date.now() - lastSent) / 1000);
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
    }

    // Invalidate previous active challenge
    await invalidateChallenge(activeChallenge.id);
  }

  // Create a brand new challenge with fresh cryptographically secure OTP
  const challenge = await createChallenge(normEmail, clientIp, purpose);
  return {
    success: true,
    rawOtp: challenge.rawOtp,
    expiresAt: challenge.expiresAt,
    challengeId: challenge.challengeId,
  };
}

/**
 * Verifies an entered OTP against the latest active challenge for an email.
 */
export async function verifyOtpChallenge(
  email: string,
  enteredOtp: string,
  purpose: string = 'organizer_registration'
): Promise<{ success: boolean; error?: string; attemptsRemaining?: number; challengeId?: string }> {
  const normEmail = normalizeEmail(email);
  const cleanedOtp = enteredOtp.trim();

  if (!/^\d{6}$/.test(cleanedOtp)) {
    return { success: false, error: 'Verification code must be exactly 6 digits.' };
  }

  const challenge = await getLatestActiveChallenge(normEmail, purpose);

  if (!challenge) {
    return { success: false, error: 'No active verification code found. Please request a new code.' };
  }

  if (challenge.verified_at) {
    return { success: false, error: 'This verification code has already been used.' };
  }

  if (challenge.attempt_count >= challenge.max_attempts) {
    return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
  }

  const now = new Date();
  const expiresAt = new Date(challenge.expires_at);
  if (now > expiresAt) {
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // Cryptographic constant-time comparison
  const isValid = safeCompareHash(cleanedOtp, challenge.otp_hash);

  if (!isValid) {
    const newAttemptCount = challenge.attempt_count + 1;
    await updateAttemptCount(challenge.id, newAttemptCount);
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

  // Mark challenge verified
  await markChallengeVerified(challenge.id);

  return { success: true, challengeId: challenge.id };
}

async function enforceCreationRateLimits(email: string, ipHash: string): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const adminClient = createAdminClient();

  try {
    const { data: emailChallenges, error: emailError } = await adminClient
      .from('organizer_verification_challenges')
      .select('id')
      .eq('email', email)
      .gte('created_at', oneHourAgo);

    if (!emailError && emailChallenges && emailChallenges.length >= MAX_HOURLY_CHALLENGES_PER_EMAIL) {
      throw new Error('Too many registration attempts for this email. Please try again in an hour.');
    }

    const { data: ipChallenges, error: ipError } = await adminClient
      .from('organizer_verification_challenges')
      .select('id')
      .eq('request_ip_hash', ipHash)
      .gte('created_at', oneHourAgo);

    if (!ipError && ipChallenges && ipChallenges.length >= MAX_HOURLY_REQUESTS_PER_IP) {
      throw new Error('Too many registration requests from this network. Please try again later.');
    }
  } catch (err: any) {
    if (err?.message?.includes('schema cache') || err?.code === 'PGRST205') {
      // In-memory rate limiting check
      let emailCount = 0;
      let ipCount = 0;
      const oneHourAgoMs = Date.now() - 60 * 60 * 1000;

      for (const record of memoryChallengeStore.values()) {
        const createdAtMs = new Date(record.created_at).getTime();
        if (createdAtMs >= oneHourAgoMs) {
          if (record.email === email) emailCount++;
          if (record.request_ip_hash === ipHash) ipCount++;
        }
      }

      if (emailCount >= MAX_HOURLY_CHALLENGES_PER_EMAIL) {
        throw new Error('Too many registration attempts for this email. Please try again in an hour.');
      }
      if (ipCount >= MAX_HOURLY_REQUESTS_PER_IP) {
        throw new Error('Too many registration requests from this network. Please try again later.');
      }
      return;
    }
    throw err;
  }
}

async function getLatestActiveChallenge(
  email: string,
  purpose: string
): Promise<VerificationChallengeRecord | null> {
  const adminClient = createAdminClient();

  try {
    const { data, error } = await adminClient
      .from('organizer_verification_challenges')
      .select('*')
      .eq('email', email)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return getMemoryChallenge(email, purpose);
      }
      throw error;
    }

    return (data as VerificationChallengeRecord) || null;
  } catch (err: any) {
    if (err?.message?.includes('schema cache') || err?.code === 'PGRST205') {
      return getMemoryChallenge(email, purpose);
    }
    return null;
  }
}

function getMemoryChallenge(email: string, purpose: string): VerificationChallengeRecord | null {
  const matching: VerificationChallengeRecord[] = [];
  for (const record of memoryChallengeStore.values()) {
    if (record.email === email && record.purpose === purpose) {
      matching.push(record);
    }
  }
  matching.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return matching[0] || null;
}

async function updateAttemptCount(challengeId: string, count: number): Promise<void> {
  const adminClient = createAdminClient();
  try {
    const { error } = await adminClient
      .from('organizer_verification_challenges')
      .update({ attempt_count: count })
      .eq('id', challengeId);

    if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
      const rec = memoryChallengeStore.get(challengeId);
      if (rec) rec.attempt_count = count;
    }
  } catch {
    const rec = memoryChallengeStore.get(challengeId);
    if (rec) rec.attempt_count = count;
  }
}

async function markChallengeVerified(challengeId: string): Promise<void> {
  const adminClient = createAdminClient();
  const now = new Date().toISOString();
  try {
    const { error } = await adminClient
      .from('organizer_verification_challenges')
      .update({ verified_at: now })
      .eq('id', challengeId);

    if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
      const rec = memoryChallengeStore.get(challengeId);
      if (rec) rec.verified_at = now;
    }
  } catch {
    const rec = memoryChallengeStore.get(challengeId);
    if (rec) rec.verified_at = now;
  }
}

async function invalidateChallenge(challengeId: string): Promise<void> {
  const adminClient = createAdminClient();
  // Setting expires_at to 1 second ago immediately invalidates it
  const expiredTime = new Date(Date.now() - 1000).toISOString();
  try {
    const { error } = await adminClient
      .from('organizer_verification_challenges')
      .update({ expires_at: expiredTime })
      .eq('id', challengeId);

    if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
      const rec = memoryChallengeStore.get(challengeId);
      if (rec) rec.expires_at = expiredTime;
    }
  } catch {
    const rec = memoryChallengeStore.get(challengeId);
    if (rec) rec.expires_at = expiredTime;
  }
}
