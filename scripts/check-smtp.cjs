// Checks the platform SMTP settings that send team invitations and contact-form emails.
// Usage: node scripts/check-smtp.cjs [recipient@example.com]
// Reads .env, logs in to the SMTP server, and (if a recipient is given) sends a test email.
const nodemailer = require('nodemailer');

try {
  process.loadEnvFile('.env');
} catch {
  console.log('No .env file found; using the current environment.');
}

const env = process.env;
const host = env.PLATFORM_SMTP_HOST || env.SMTP_HOST;
const user = env.PLATFORM_SMTP_USER || env.SMTP_USER;
const pass = env.PLATFORM_SMTP_PASS || env.SMTP_PASS;
const port = parseInt(env.PLATFORM_SMTP_PORT || env.SMTP_PORT || '587', 10);
const fromEmail = env.PLATFORM_SMTP_FROM || env.SMTP_FROM || user;
const fromName = env.PLATFORM_SMTP_FROM_NAME || env.SMTP_FROM_NAME || 'Aram Events';

const missing = [
  ['PLATFORM_SMTP_HOST', host],
  ['PLATFORM_SMTP_USER', user],
  ['PLATFORM_SMTP_PASS', pass],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.error(`Missing: ${missing.join(', ')}. Add them to .env, then run this again.`);
  process.exit(1);
}

(async () => {
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  console.log(`Connecting to ${host}:${port} as ${user} ...`);
  try {
    await transport.verify();
    console.log('OK: the server accepted the login.');
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
    if (/535|Invalid login|Username and Password not accepted/i.test(err.message)) {
      console.error('Hint: for Gmail use an App Password (Google Account > Security > 2-Step Verification > App passwords), not your normal password.');
    }
    process.exit(1);
  }

  const to = process.argv[2];
  if (!to) return console.log('Add a recipient to send a test email: node scripts/check-smtp.cjs you@example.com');
  const info = await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: 'Aram Events SMTP test',
    text: 'If you can read this, platform emails will be delivered.',
  });
  console.log(`Sent test email to ${to} (id ${info.messageId}). Check the inbox and spam folder.`);
})();
