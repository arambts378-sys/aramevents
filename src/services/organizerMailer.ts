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
/** Pasted secrets often carry a trailing space or newline, or wrapping quotes. */
function cleanEnv(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/^(['"])(.*)$/, '$2').trim();
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

/** True when any delivery route (HTTPS API or SMTP) is configured. */
async function isMailConfigured(): Promise<boolean> {
  return !!resolveHttpMailConfig() || !!(await resolvePlatformSmtpConfig());
}

/** Sends through the HTTPS API when configured, otherwise through SMTP. */
async function deliver(mail: OutgoingMail): Promise<{ success: boolean; messageId?: string }> {
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
