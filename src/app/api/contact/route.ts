import { NextRequest, NextResponse } from 'next/server';
import { sendPlatformEmail } from '@/services/organizerMailer';
import { normalizeEmail, validateEmail } from '@/lib/validation/auth';
import { getTrustedClientIp } from '@/lib/security/clientIp';
import { CONTACT_TOPICS as TOPICS } from '@/lib/site';

// Best-effort per-instance throttle; the honeypot and length limits do most of the work.
const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function throttled(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > MAX_PER_WINDOW;
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '');

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Bots fill every field, including the hidden one.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ success: true });
  }

  const name = clean(body.name, 120);
  const organization = clean(body.organization, 160);
  const topic = TOPICS.includes(body.topic as (typeof TOPICS)[number]) ? (body.topic as string) : 'Something else';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = 'Enter your name.';
  const emailError = validateEmail(body.email);
  if (emailError) fieldErrors.email = emailError;
  if (message.length < 10) fieldErrors.message = 'Write at least a sentence so we know how to help.';
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: 'Check the highlighted fields.', fieldErrors }, { status: 400 });
  }

  const inbox = process.env.CONTACT_INBOX_EMAIL;
  if (!inbox) {
    return NextResponse.json(
      { error: 'The contact form is not connected to an inbox yet. Please try again later.' },
      { status: 503 }
    );
  }

  if (throttled(getTrustedClientIp(req) || 'unknown')) {
    return NextResponse.json({ error: 'Too many messages from this connection. Try again in an hour.' }, { status: 429 });
  }

  const email = normalizeEmail(body.email as string);
  try {
    await sendPlatformEmail({
      to: inbox,
      replyTo: email,
      subject: `[aram.events] ${topic}: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nOrganization: ${organization || '-'}\nTopic: ${topic}\n\n${message}`,
    });
  } catch (err) {
    const e = err as { name?: string; code?: string } | null;
    console.error('[contact] delivery failed', { name: e?.name, code: e?.code });
    return NextResponse.json({ error: 'Your message could not be sent. Please try again in a few minutes.' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
