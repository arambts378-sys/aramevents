import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

/**
 * QR Credentials Service
 * Handles secure generation, revocation, and validation of attendee QR tokens.
 * ALL METHODS HERE MUST BE EXECUTED SERVER-SIDE.
 */

function getQrSigningSecrets(): { primary: string; rotation: string[] } {
  const primary =
    process.env.QR_SIGNING_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!primary) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('QR_SIGNING_SECRET environment variable is required in production.');
    }
    return { primary: 'arambts-qr-signing-key-32-bytes-secure', rotation: [] };
  }

  const rotationRaw = process.env.QR_ROTATION_SECRETS || '';
  const rotation = rotationRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== primary);

  // Add Supabase service-role key as rotation fallback for existing tickets if separate
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey !== primary && !rotation.includes(serviceKey)) {
    rotation.push(serviceKey);
  }

  return { primary, rotation };
}

// Format: ARAM:<64-char-hex>
export const generateRawToken = (credentialId: string, secretOverride?: string) => {
  const secret = secretOverride || getQrSigningSecrets().primary;
  const rawToken = crypto.createHmac('sha256', secret).update(credentialId).digest('hex');
  return `ARAM:${rawToken}`;
};

export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const qrCredentialsService = {
  
  /**
   * Generates a new QR credential for a confirmed registration.
   * Returns the RAW token ONLY ONCE during generation.
   * Do not store the raw token anywhere.
   */
  async generateQrCredential(eventId: string, registrationId: string, useAdmin: boolean = false) {
    const supabase = useAdmin ? createAdminClient() : await createClient();

    // 1. Validate registration is eligible and belongs to this event
    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select('status, event_id')
      .eq('id', registrationId)
      .eq('event_id', eventId)
      .single();

    if (regError || !reg) {
      throw new Error('Registration not found or inaccessible');
    }

    if (reg.status !== 'confirmed') {
      throw new Error(`Cannot generate QR for ${reg.status} registration`);
    }

    // 2. Ensure no existing active credential exists
    const { data: existing } = await supabase
      .from('qr_credentials')
      .select('id')
      .eq('registration_id', registrationId)
      .eq('status', 'active')
      .single();

    if (existing) {
      throw new Error('An active QR credential already exists for this registration');
    }

    // 3. Generate secure token deterministically using a new ID and primary signing secret
    const credentialId = crypto.randomUUID();
    const rawToken = generateRawToken(credentialId);
    const hashedToken = hashToken(rawToken);

    // 4. Store the hash
    const { data: credential, error: insertError } = await supabase
      .from('qr_credentials')
      .insert({
        id: credentialId,
        event_id: eventId,
        registration_id: registrationId,
        credential_token_hash: hashedToken,
        credential_prefix: 'ARAM',
        status: 'active'
      })
      .select('*')
      .single();

    if (insertError) {
      throw new Error('Failed to generate QR credential: ' + insertError.message);
    }

    // Return the raw token so the UI can render the initial QR code or email it
    return {
      credential,
      rawToken
    };
  },

  /**
   * Gets the active QR credential metadata for a registration
   */
  async getQrCredential(registrationId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('qr_credentials')
      .select('*')
      .eq('registration_id', registrationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching QR credential:', error);
      return null;
    }

    return data;
  },

  /**
   * Recovers the raw token for an active credential using the server secret.
   * If a stored token hash is known, checks primary and rotation secrets.
   */
  recoverRawToken(credentialId: string, expectedHash?: string) {
    const { primary, rotation } = getQrSigningSecrets();
    const primaryToken = generateRawToken(credentialId, primary);
    if (!expectedHash) {
      return primaryToken;
    }

    if (hashToken(primaryToken) === expectedHash) {
      return primaryToken;
    }

    for (const rotSecret of rotation) {
      const candidateToken = generateRawToken(credentialId, rotSecret);
      if (hashToken(candidateToken) === expectedHash) {
        return candidateToken;
      }
    }

    return primaryToken;
  },

  /**
   * Revokes a specific QR credential
   */
  async revokeQrCredential(credentialId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('qr_credentials')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('id', credentialId)
      .select('*')
      .single();

    if (error) throw new Error('Failed to revoke QR credential: ' + error.message);
    return data;
  },

  /**
   * Regenerates a QR credential by revoking the active one and issuing a new one
   */
  async regenerateQrCredential(eventId: string, registrationId: string, useAdmin: boolean = false) {
    const supabase = useAdmin ? createAdminClient() : await createClient();
    
    // Revoke any active credentials first
    const { data: activeCreds } = await supabase
      .from('qr_credentials')
      .select('id')
      .eq('registration_id', registrationId)
      .eq('status', 'active');

    if (activeCreds && activeCreds.length > 0) {
      for (const cred of activeCreds) {
        await this.revokeQrCredential(cred.id);
      }
    }

    // Generate new
    return this.generateQrCredential(eventId, registrationId, useAdmin);
  },

  /**
   * Core validation method for scanners.
   * Maps a raw scanned token to a valid registration.
   */
  async validateQrCredential(rawToken: string, eventId: string) {
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.startsWith('ARAM:')) {
      return { valid: false, reason: 'Malformed QR code format' };
    }

    const supabase = createAdminClient();
    const hashedToken = hashToken(rawToken);

    const { data: credential, error } = await supabase
      .from('qr_credentials')
      .select(`
        *,
        registrations (
          id,
          status,
          registration_number,
          event_people (
            people (
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('credential_token_hash', hashedToken)
      .eq('event_id', eventId)
      .single();

    if (error || !credential) {
      return { valid: false, reason: 'Invalid or unknown QR code' };
    }

    if (credential.status !== 'active') {
      return { valid: false, reason: `QR code is ${credential.status}` };
    }

    if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
      return { valid: false, reason: 'QR code has expired' };
    }

    const reg = credential.registrations as Record<string, unknown> | null;
    if (!reg || reg.status !== 'confirmed') {
      return { valid: false, reason: 'Registration is not confirmed' };
    }

    // Update last_used_at (fire and forget)
    supabase.from('qr_credentials').update({ last_used_at: new Date().toISOString() }).eq('id', credential.id).then();

    return {
      valid: true,
      credentialId: credential.id,
      registration: reg
    };
  }

};
