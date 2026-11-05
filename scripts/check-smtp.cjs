// Checks the platform email settings that send organizer verification codes, team invitations
// and contact-form emails.
// Usage: node scripts/check-smtp.cjs [recipient@example.com]
// Reads .env. With ZOHO_CPAAS_SEND_MAIL_TOKEN set it sends a test email through Zoho CPaaS (a
// recipient is required). Otherwise it logs in to the SMTP server and, if a recipient is given,
// sends a test email.
const nodemailer = require('nodemailer');

try {
  process.loadEnvFile('.env');
} catch {
  console.log('No .env file found; using the current environment.');
}

const env = process.env;

const zohoToken = (env.ZOHO_CPAAS_SEND_MAIL_TOKEN || '').trim().replace(/^zoho-enczapikey\s+/i, '');
if (zohoToken) {
  const url = env.ZOHO_CPAAS_API_URL || 'https://cpaas.zoho.in/v1.1/email';
  const address = env.ZOHO_CPAAS_FROM || 'arambts@aram.events';
  const to = process.argv[2];
  if (!to) {
    console.error('Add a recipient: node scripts/check-smtp.cjs you@example.com');
    process.exit(1);
  }
  fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Zoho-enczapikey ${zohoToken}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      from: { address, name: env.PLATFORM_SMTP_FROM_NAME || 'Aram Events' },
      to: [{ email_address: { address: to } }],
      subject: 'Aram Events email test',
      textbody: 'If you can read this, verification codes will be delivered.',
    }),
  })
    .then(async (res) => {
      const body = await res.text();
      if (!res.ok) {
        console.error(`FAILED: ${url} returned ${res.status}: ${body.slice(0, 500)}`);
        process.exit(1);
      }
      console.log(`Sent from ${address} to ${to}. Check the inbox and spam folder.`);
    })
    .catch((err) => {
      console.error(`FAILED: ${err.message}`);
      process.exit(1);
    });
  return;
}
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
    text: 'If you can read this, verification codes will be delivered.',
  });
  console.log(`Sent test email to ${to} (id ${info.messageId}). Check the inbox and spam folder.`);
})();
