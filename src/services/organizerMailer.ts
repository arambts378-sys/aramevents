import nodemailer from 'nodemailer';
import { GENERAL_EMAIL, SITE_URL, SUPPORT_EMAIL } from '@/lib/site';

/**
 * The hosted PNG, not an attachment or SVG: Gmail does not render SVG, and an absolute URL
 * works in every mail client. Always the public site, so it also loads in emails sent from dev.
 */
const EMAIL_LOGO_HTML = `<img src="${SITE_URL}/aram-logo.png" alt="Aram" width="132" height="40" style="display:inline-block;width:132px;height:40px;border:0;" />`;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Resolves platform SMTP transport credentials.
 * SECURITY FIX (H2): Platform credentials MUST be sourced exclusively from trusted
 * platform environment configuration. Under NO circumstances should signup verification
 * OTPs fall back to tenant/customer event_integrations records.
 */
/** Pasted secrets often carry a trailing space or newline, or wrapping quotes. */
function cleanEnv(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  return cleaned || undefined;
}

export async function resolvePlatformSmtpConfig(): Promise<SmtpOptions | null> {
  const host = cleanEnv(process.env.PLATFORM_SMTP_HOST) || cleanEnv(process.env.SMTP_HOST);
  const user = cleanEnv(process.env.PLATFORM_SMTP_USER) || cleanEnv(process.env.SMTP_USER);
  const pass = cleanEnv(process.env.PLATFORM_SMTP_PASS) || cleanEnv(process.env.SMTP_PASS);

  if (host && user && pass) {
    const rawPort = cleanEnv(process.env.PLATFORM_SMTP_PORT) || cleanEnv(process.env.SMTP_PORT) || '587';
    const port = parseInt(rawPort, 10);
    const fromEmail = cleanEnv(process.env.PLATFORM_SMTP_FROM) || cleanEnv(process.env.SMTP_FROM) || user;
    const fromName =
      cleanEnv(process.env.PLATFORM_SMTP_FROM_NAME) || cleanEnv(process.env.SMTP_FROM_NAME) || 'Aram Events';

    return {
      host,
      port,
      secure: port === 465,
      user,
      pass,
      fromEmail,
      fromName,
    };
  }

  return null;
}

/** Host and port only (never credentials), so a misconfigured value shows up in the logs. */
export async function describePlatformSmtp(): Promise<string> {
  const smtp = await resolvePlatformSmtpConfig();
  if (resolveZohoMailConfig()) return 'route=zoho-cpaas';
  if (resolveHttpMailConfig()) return 'route=brevo-api';
  return smtp ? `route=smtp host=${JSON.stringify(smtp.host)} port=${smtp.port} secure=${smtp.secure}` : 'not configured';
}

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

interface HttpMailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * HTTPS email delivery (Brevo). Cloudflare Workers cannot reliably open raw SMTP
 * connections, so production uses this path when BREVO_API_KEY is set. The sender
 * must be a verified sender in the Brevo account (PLATFORM_SMTP_FROM).
 */
function resolveHttpMailConfig(): HttpMailConfig | null {
  const apiKey = cleanEnv(process.env.BREVO_API_KEY);
  const fromEmail = cleanEnv(process.env.PLATFORM_SMTP_FROM) || cleanEnv(process.env.PLATFORM_MAIL_FROM);
  if (!apiKey || !fromEmail) return null;
  return {
    apiKey,
    fromEmail,
    fromName: cleanEnv(process.env.PLATFORM_SMTP_FROM_NAME) || 'Aram Events',
  };
}

async function sendViaBrevo(cfg: HttpMailConfig, mail: OutgoingMail) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cfg.apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: cfg.fromName, email: cfg.fromEmail },
      to: [{ email: mail.to }],
      ...(mail.replyTo ? { replyTo: { email: mail.replyTo } } : {}),
      subject: mail.subject,
      textContent: mail.text,
      ...(mail.html ? { htmlContent: mail.html } : {}),
    }),
  });
  if (!res.ok) {
    // Brevo's error body names the problem (for example an unverified sender); it never echoes the key.
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`Brevo API ${res.status}: ${detail}`);
  }
  const json = (await res.json().catch(() => ({}))) as { messageId?: string };
  return { success: true, messageId: json.messageId };
}

interface ZohoMailConfig {
  token: string;
  apiUrl: string;
  fromEmail: string;
  fromName: string;
}

const ZOHO_CPAAS_API_URL = 'https://cpaas.zoho.in/v1.1/email';

/**
 * HTTPS email delivery through Zoho CPaaS, the preferred route for platform email because
 * Cloudflare Workers cannot reliably open raw SMTP connections. The token is the Send Mail Token
 * from the Agent's SMTP/API section. PLATFORM_SMTP_FROM is deliberately not read here, so a sender
 * left over from another provider cannot replace the address verified in Zoho.
 */
function resolveZohoMailConfig(): ZohoMailConfig | null {
  // The console shows the full header value, so accept the token with its scheme prefix too.
  const token = cleanEnv(process.env.ZOHO_CPAAS_SEND_MAIL_TOKEN)?.replace(/^zoho-enczapikey\s+/i, '');
  if (!token) return null;
  return {
    token,
    apiUrl: cleanEnv(process.env.ZOHO_CPAAS_API_URL) || ZOHO_CPAAS_API_URL,
    fromEmail: cleanEnv(process.env.ZOHO_CPAAS_FROM) || GENERAL_EMAIL,
    fromName: cleanEnv(process.env.PLATFORM_SMTP_FROM_NAME) || 'Aram Events',
  };
}

async function sendViaZoho(cfg: ZohoMailConfig, mail: OutgoingMail) {
  const res = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers: {
      authorization: `Zoho-enczapikey ${cfg.token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      from: { address: cfg.fromEmail, name: cfg.fromName },
      to: [{ email_address: { address: mail.to } }],
      ...(mail.replyTo ? { reply_to: [{ address: mail.replyTo }] } : {}),
      subject: mail.subject,
      textbody: mail.text,
      ...(mail.html ? { htmlbody: mail.html } : {}),
    }),
  });
  if (!res.ok) {
    // Zoho's error body names the problem (for example an unverified sender); it never echoes the token.
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`Zoho CPaaS API ${res.status}: ${detail}`);
  }
  const json = (await res.json().catch(() => ({}))) as { request_id?: string };
  return { success: true, messageId: json.request_id };
}

/** True when any delivery route (HTTPS API or SMTP) is configured. */
async function isMailConfigured(): Promise<boolean> {
  return !!resolveZohoMailConfig() || !!resolveHttpMailConfig() || !!(await resolvePlatformSmtpConfig());
}

/** Sends through an HTTPS API when configured (Zoho CPaaS first), otherwise through SMTP. */
async function deliver(mail: OutgoingMail): Promise<{ success: boolean; messageId?: string }> {
  const zoho = resolveZohoMailConfig();
  if (zoho) return sendViaZoho(zoho, mail);

  const http = resolveHttpMailConfig();
  if (http) return sendViaBrevo(http, mail);

  const smtp = await resolvePlatformSmtpConfig();
  if (!smtp) throw new Error('Platform email delivery service is not configured. Please contact support.');

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  const info = await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: mail.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return { success: true, messageId: info.messageId };
}

/** Simulated delivery is only allowed in tests, `next dev`, or when explicitly opted in. */
function canSimulateEmail(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    process.env.ALLOW_SIMULATED_EMAIL === 'true'
  );
}

export async function sendOrganizerVerificationEmail(
  toEmail: string,
  otpCode: string,
  expirationMinutes: number = 10
): Promise<{ success: boolean; messageId?: string }> {
  const configured = await isMailConfigured();

  if (!configured) {
    // In automated tests or local development without platform credentials, allow explicit mock or simulation
    if (canSimulateEmail()) {
      if (process.env.NODE_ENV !== 'production') {
        // Without SMTP there is no other way to read the code locally.
        console.info(`[organizerMailer] SMTP not configured; simulated verification code for ${toEmail}: ${otpCode}`);
      }
      return { success: true, messageId: 'simulated-dev-id' };
    }
    // Fail closed in production / live environments
    throw new Error('Platform email delivery service is not configured. Please contact support.');
  }

  const subject = `${otpCode} is your Aram Events verification code`;
  // Email clients remove scripts, so a button cannot reach the clipboard from inside the email.
  // It opens the verification page, which fills in the code. The code stays in the URL fragment,
  // which browsers do not send to the server, so it never reaches request logs.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const copyUrl = `${appUrl}/organizer/verify?email=${encodeURIComponent(toEmail)}#code=${otpCode}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F5FF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17152B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F7F5FF; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E6E2F0; box-shadow: 0 4px 20px rgba(124, 92, 252, 0.05); overflow: hidden;" cellspacing="0" cellpadding="0">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #F0EEF8;">
              ${EMAIL_LOGO_HTML}
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <h1 style="font-size: 22px; font-weight: 700; color: #17152B; margin: 0 0 12px; letter-spacing: -0.3px;">
                Verify your email address
              </h1>
              <p style="font-size: 14px; line-height: 22px; color: #77738A; margin: 0 0 28px;">
                Welcome to Aram Events. Please enter the verification code below to confirm your organizer account and get started.
              </p>

              <!-- Verification Code Display -->
              <div style="background-color: #F7F5FF; border: 1px solid #E6E2F0; border-radius: 12px; padding: 20px 24px; margin: 0 auto 8px; display: inline-block;">
                <span style="font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #7C5CFC; display: block; margin-left: 8px; -webkit-user-select: all; user-select: all;">${otpCode}</span>
              </div>
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 8px auto 12px;">
                <tr>
                  <td style="background-color: #7C5CFC; border-radius: 10px; text-align: center;">
                    <a href="${copyUrl}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none;">Copy code</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #77738A; margin: 0 0 24px;">
                This opens the verification page with your code filled in. You can also double-click the code to select it.
              </p>

              <p style="font-size: 13px; color: #77738A; margin: 0 0 24px;">
                This code will expire in <strong>${expirationMinutes} minutes</strong>.
              </p>

              <!-- Security Notice -->
              <div style="background-color: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 8px; padding: 12px 16px; text-align: left;">
                <p style="font-size: 12px; line-height: 18px; color: #92400E; margin: 0;">
                  <strong>Security notice:</strong> Never share this code with anyone. Aram Events representatives will never ask you for your verification code.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; background-color: #FAFAFD; border-top: 1px solid #F0EEF8; text-align: center;">
              <p style="font-size: 12px; line-height: 18px; color: #77738A; margin: 0 0 8px;">
                If you did not request this account creation, you can safely ignore this email.
              </p>
              <p style="font-size: 11px; color: #A19EB0; margin: 0;">
                © 2026 Aram Events. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Your Aram Events verification code is:

${otpCode}

Copy it and paste it on the verification page to confirm your organizer account:
${copyUrl}

This code will expire in ${expirationMinutes} minutes.

SECURITY NOTICE:
Never share this code with anyone. Aram Events representatives will never ask you for your verification code.

If you did not request this account creation, please ignore this email.

© 2026 Aram Events.
`.trim();

  return deliver({ to: toEmail, replyTo: SUPPORT_EMAIL, subject, text, html });
}

/**
 * Sent instead of a verification code when someone tries to register an email that already
 * has a verified account. The registration API response is identical in both cases, so the
 * existence of the account is only disclosed to the owner of the mailbox.
 */
export async function sendExistingAccountNoticeEmail(
  toEmail: string
): Promise<{ success: boolean; messageId?: string }> {
  const configured = await isMailConfigured();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const loginUrl = `${appUrl}/login`;
  const recoveryUrl = `${appUrl}/forgot-password`;
  const subject = 'You already have an Aram Events account';

  if (!configured) {
    if (canSimulateEmail()) {
      return { success: true, messageId: 'simulated-dev-id' };
    }
    throw new Error('Platform email delivery service is not configured. Please contact support.');
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#F7F5FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17152B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F5FF;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E6E2F0;" cellspacing="0" cellpadding="0">
        <tr><td style="padding:32px;text-align:center;">
          <div style="margin:0 0 20px;">${EMAIL_LOGO_HTML}</div>
          <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;">You already have an account</h1>
          <p style="font-size:14px;line-height:22px;color:#77738A;margin:0 0 24px;">
            Someone tried to create an Aram Events organizer account with this email address, but an account already exists. No changes were made.
          </p>
          <a href="${loginUrl}" style="display:inline-block;background-color:#7C5CFC;color:#FFFFFF;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:12px;">Sign in</a>
          <p style="font-size:12px;line-height:18px;color:#77738A;margin:16px 0 0;">
            Forgot your password? <a href="${recoveryUrl}" style="color:#7C5CFC;font-weight:700;">Reset it here</a>.
          </p>
          <p style="font-size:12px;line-height:18px;color:#77738A;margin:24px 0 0;">
            If this wasn't you, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `
Aram Events — You already have an account

Someone tried to create an Aram Events organizer account with this email address, but an account already exists. No changes were made.

Sign in: ${loginUrl}
Reset password: ${recoveryUrl}

If this wasn't you, you can safely ignore this email.
`.trim();

  return deliver({ to: toEmail, replyTo: SUPPORT_EMAIL, subject, text, html });
}

/**
 * Sent through the same route as verification codes. Supabase's own recovery email is not used,
 * because its SMTP send to Zoho timed out at Supabase's 10-second limit.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<{ success: boolean; messageId?: string }> {
  if (!(await isMailConfigured())) {
    if (canSimulateEmail()) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[organizerMailer] email not configured; simulated reset link for ${toEmail}: ${resetUrl}`);
      }
      return { success: true, messageId: 'simulated-dev-id' };
    }
    throw new Error('Platform email delivery service is not configured. Please contact support.');
  }

  const subject = 'Reset your Aram Events password';

  const html = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F5FF;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17152B;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #E6E2F0;border-radius:16px;">
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #F0EEF8;">
            ${EMAIL_LOGO_HTML}
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 8px;text-align:center;">
            <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#17152B;">Reset your password</h1>
            <p style="font-size:14px;line-height:22px;color:#5F5B73;margin:0 0 16px;">We received a request to reset the password for this Aram Events account:</p>
            <p style="font-size:15px;font-weight:700;color:#17152B;background-color:#F7F5FF;border:1px solid #E6E2F0;border-radius:10px;padding:12px 16px;margin:0 0 24px;word-break:break-all;">${escapeHtml(toEmail)}</p>
            <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto;">
              <tr>
                <td style="background-color:#7C5CFC;border-radius:10px;text-align:center;">
                  <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:13px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">Reset password</a>
                </td>
              </tr>
            </table>
            <p style="font-size:12px;line-height:18px;color:#77738A;margin:12px 0 0;">This link works only once. If it has expired, request a new one on the sign-in page.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0;text-align:left;">
            <h2 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#17152B;">How to reset your password</h2>
            <ol style="font-size:14px;line-height:22px;color:#5F5B73;margin:0;padding-left:20px;">
              <li style="margin-bottom:4px;">Click the <strong>Reset password</strong> button above.</li>
              <li style="margin-bottom:4px;">Check that the page shows the account named in this email.</li>
              <li style="margin-bottom:4px;">Enter a new password of at least 8 characters, then enter it again to confirm.</li>
              <li>Click <strong>Update password</strong>. You will then be taken to your account.</li>
            </ol>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0;text-align:left;">
            <h2 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#166534;">Do</h2>
            <ul style="font-size:14px;line-height:22px;color:#5F5B73;margin:0;padding-left:20px;">
              <li style="margin-bottom:4px;">Choose a password you do not use on any other site.</li>
              <li style="margin-bottom:4px;">Check that this email came from ${GENERAL_EMAIL}.</li>
              <li>Sign out of shared devices when you finish.</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 24px;text-align:left;">
            <h2 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#B42318;">Don't</h2>
            <ul style="font-size:14px;line-height:22px;color:#5F5B73;margin:0;padding-left:20px;">
              <li style="margin-bottom:4px;">Don't share or forward this email. Anyone with the link can change your password.</li>
              <li style="margin-bottom:4px;">Don't enter your password on any site that is not your Aram Events sign-in page.</li>
              <li>Don't reply with your password. Aram Events will never ask you for it.</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="font-size:12px;line-height:18px;color:#92400E;background-color:#FFFBEB;border:1px solid #FEF3C7;border-radius:8px;padding:12px 16px;margin:0;"><strong>Did not ask for this?</strong> You can ignore this email and your password will stay the same. If you keep getting these emails, contact ${SUPPORT_EMAIL}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background-color:#FAFAFD;border-top:1px solid #F0EEF8;text-align:center;border-radius:0 0 16px 16px;">
            <p style="font-size:12px;line-height:18px;color:#77738A;margin:0 0 4px;">Need help? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#7C5CFC;font-weight:700;text-decoration:none;">${SUPPORT_EMAIL}</a></p>
            <p style="font-size:11px;color:#A19EB0;margin:0;">© 2026 Aram Events. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const text = `
Reset your Aram Events password

We received a request to reset the password for this Aram Events account: ${toEmail}

Reset your password here:
${resetUrl}

This link works only once. If it has expired, request a new one on the sign-in page.

How to reset your password
1. Open the link above.
2. Check that the page shows the account named in this email.
3. Enter a new password of at least 8 characters, then enter it again to confirm.
4. Click Update password. You will then be taken to your account.

Do
- Choose a password you do not use on any other site.
- Check that this email came from ${GENERAL_EMAIL}.
- Sign out of shared devices when you finish.

Don't
- Don't share or forward this email. Anyone with the link can change your password.
- Don't enter your password on any site that is not your Aram Events sign-in page.
- Don't reply with your password. Aram Events will never ask you for it.

Did not ask for this? You can ignore this email and your password will stay the same.
If you keep getting these emails, contact ${SUPPORT_EMAIL}.
`.trim();

  return deliver({ to: toEmail, replyTo: SUPPORT_EMAIL, subject, text, html });
}

/** Sends a plain platform email (team invitations, contact form). Throws if SMTP is not configured. */
export async function sendPlatformEmail(message: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}) {
  if (!(await isMailConfigured())) {
    throw new Error('Platform email delivery is not configured.');
  }
  return deliver(message);
}
