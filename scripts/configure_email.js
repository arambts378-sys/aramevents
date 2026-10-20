const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Service Role Key are required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required (must be 32 bytes hex or plaintext).');
}

function getKey() {
  if (ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  if (Buffer.from(ENCRYPTION_KEY).length === 32) {
    return Buffer.from(ENCRYPTION_KEY);
  }
  throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters or 32 plaintext characters).');
}

/**
 * Standard AES-256-GCM encryption matching src/utils/encryption.ts (Functional Bug 4 fix)
 * Format: v1:<iv>:<authTag>:<ciphertext>
 */
function encryptSecret(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function configureEmail() {
  const eventId = process.env.EVENT_ID;
  const email = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const fromEmail = process.env.SMTP_FROM || email;
  const fromName = process.env.SMTP_FROM_NAME || 'ARAM BTS';

  if (!eventId) {
    throw new Error('EVENT_ID environment variable is required.');
  }
  if (!email || !password) {
    throw new Error('SMTP_USER and SMTP_PASS environment variables are required.');
  }

  const encryptedPass = encryptSecret(password);

  const config = {
    host,
    port,
    user: email,
    pass: encryptedPass,
    fromEmail,
    fromName,
    from: fromEmail,
  };

  const { data, error } = await supabase.from('event_integrations').upsert({
    event_id: eventId,
    provider: 'email',
    is_active: true,
    config: config
  }, { onConflict: 'event_id,provider' });

  if (error) {
    console.error('Failed to configure email:', error);
    process.exit(1);
  } else {
    console.log('Successfully configured email integration for event:', eventId);
  }
}

configureEmail().catch((err) => {
  console.error(err);
  process.exit(1);
});
