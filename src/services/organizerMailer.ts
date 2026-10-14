import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret } from '@/utils/encryption';

interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

async function resolveSmtpConfig(): Promise<SmtpOptions | null> {
  // 1. Check environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    return {
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER,
      fromName: process.env.SMTP_FROM_NAME || 'ARAM BTS',
    };
  }

  // 2. Query existing active email integration in Supabase
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('event_integrations')
      .select('config')
      .eq('provider', 'email')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!error && data?.config) {
      const config = data.config as {
        host?: string;
        port?: string | number;
        user?: string;
        pass?: string;
        from?: string;
        fromEmail?: string;
        fromName?: string;
      };

      if (config.host && config.user && config.pass) {
        let rawPass = config.pass;
        if (rawPass.startsWith('v1:')) {
          try {
            rawPass = decryptSecret(rawPass);
          } catch (decErr) {
            console.error('Failed to decrypt SMTP secret from integration config:', decErr);
            return null;
          }
        }

        const port = typeof config.port === 'string' ? parseInt(config.port, 10) : config.port || 465;
        return {
          host: config.host,
          port,
          secure: port === 465,
          user: config.user,
          pass: rawPass,
          fromEmail: config.fromEmail || config.from || config.user,
          fromName: config.fromName || 'ARAM BTS',
        };
      }
    }
  } catch (err) {
    console.warn('Could not retrieve SMTP credentials from event_integrations:', err);
  }

  return null;
}

export async function sendOrganizerVerificationEmail(
  toEmail: string,
  otpCode: string,
  expirationMinutes: number = 10
): Promise<{ success: boolean; messageId?: string }> {
  const smtp = await resolveSmtpConfig();

  const subject = 'Verify your ARAM BTS organizer account';

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
                    <span style="font-size: 20px; font-weight: 800; color: #17152B; letter-spacing: -0.5px; display: block;">ARAM BTS</span>
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
                Welcome to ARAM BTS. Please enter the verification code below to confirm your organizer account and get started.
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
                  <strong>Security notice:</strong> Never share this code with anyone. ARAM BTS representatives will never ask you for your verification code.
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
                © 2026 ARAM BTS. All rights reserved.
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
ARAM BTS — Verify your organizer account

Welcome to ARAM BTS. Please enter the verification code below to confirm your organizer account:

Verification Code: ${otpCode}

This code will expire in ${expirationMinutes} minutes.

SECURITY NOTICE:
Never share this code with anyone. ARAM BTS representatives will never ask you for your verification code.

If you did not request this account creation, please ignore this email.

© 2026 ARAM BTS.
`.trim();

  if (!smtp) {
    // In dev environment when no SMTP is configured, log sanitized notice
    console.info(`[OrganizerMailer] Simulated email dispatched to ${toEmail} (SMTP not configured). Code generated securely.`);
    return { success: true, messageId: 'simulated-dev-id' };
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
