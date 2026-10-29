import nodemailer from 'nodemailer';

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
export async function resolvePlatformSmtpConfig(): Promise<SmtpOptions | null> {
  const host = process.env.PLATFORM_SMTP_HOST || process.env.SMTP_HOST;
  const user = process.env.PLATFORM_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.PLATFORM_SMTP_PASS || process.env.SMTP_PASS;

  if (host && user && pass) {
    const rawPort = process.env.PLATFORM_SMTP_PORT || process.env.SMTP_PORT || '587';
    const port = parseInt(rawPort, 10);
    const fromEmail = process.env.PLATFORM_SMTP_FROM || process.env.SMTP_FROM || user;
    const fromName = process.env.PLATFORM_SMTP_FROM_NAME || process.env.SMTP_FROM_NAME || 'Aram Events';

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
  const smtp = await resolvePlatformSmtpConfig();

  if (!smtp) {
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

  const subject = 'Verify your Aram Events organizer account';

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
              <table role="presentation" align="center" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #7C5CFC; width: 44px; height: 44px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: #FFFFFF; font-size: 22px; font-weight: 800; line-height: 44px; display: inline-block;">✦</span>
                  </td>
                  <td style="padding-left: 12px; text-align: left;">
                    <span style="font-size: 20px; font-weight: 800; color: #17152B; letter-spacing: -0.5px; display: block;">Aram Events</span>
                    <span style="font-size: 11px; font-weight: 500; color: #77738A; letter-spacing: 0.5px; display: block;">Events Beyond Boundaries</span>
                  </td>
                </tr>
              </table>
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
              <div style="background-color: #F7F5FF; border: 1px solid #E6E2F0; border-radius: 12px; padding: 20px 24px; margin: 0 auto 28px; display: inline-block;">
                <span style="font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #7C5CFC; display: block; margin-left: 8px;">
                  ${otpCode}
                </span>
              </div>

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
Aram Events — Verify your organizer account

Welcome to Aram Events. Please enter the verification code below to confirm your organizer account:

Verification Code: ${otpCode}

This code will expire in ${expirationMinutes} minutes.

SECURITY NOTICE:
Never share this code with anyone. Aram Events representatives will never ask you for your verification code.

If you did not request this account creation, please ignore this email.

© 2026 Aram Events.
`.trim();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const mailOptions = {
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: toEmail,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
}

/**
 * Sent instead of a verification code when someone tries to register an email that already
 * has a verified account. The registration API response is identical in both cases, so the
 * existence of the account is only disclosed to the owner of the mailbox.
 */
export async function sendExistingAccountNoticeEmail(
  toEmail: string
): Promise<{ success: boolean; messageId?: string }> {
  const smtp = await resolvePlatformSmtpConfig();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const loginUrl = `${appUrl}/login`;
  const recoveryUrl = `${appUrl}/forgot-password`;
  const subject = 'You already have an Aram Events account';

  if (!smtp) {
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

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const info = await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
  return { success: true, messageId: info.messageId };
}

/** Sends a plain platform email (team invitations, contact form). Throws if SMTP is not configured. */
export async function sendPlatformEmail(message: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}) {
  const smtp = await resolvePlatformSmtpConfig();
  if (!smtp) {
    throw new Error('Platform SMTP is not configured.');
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  return { success: true, messageId: info.messageId };
}
