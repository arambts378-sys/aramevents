/**
 * Zoho CPaaS delivery, with fetch stubbed: proves the request we send, not that Zoho accepts it.
 * Run: npm run test:auth
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sendOrganizerVerificationEmail, sendPasswordResetEmail, sendPlatformEmail } from '../organizerMailer';

const realFetch = globalThis.fetch;
const MANAGED = ['ZOHO_CPAAS_SEND_MAIL_TOKEN', 'ZOHO_CPAAS_API_URL', 'ZOHO_CPAAS_FROM', 'PLATFORM_SMTP_FROM', 'BREVO_API_KEY'];
const saved: Record<string, string | undefined> = {};

let calls: { url: string; init: RequestInit }[] = [];
let respond: () => Response;

beforeEach(() => {
  for (const key of MANAGED) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  calls = [];
  respond = () => new Response(JSON.stringify({ message: 'OK', request_id: 'req-1' }), { status: 200 });
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of MANAGED) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const MAIL = { to: 'organizer@example.com', subject: 'Code', text: 'Your code', html: '<b>Your code</b>', replyTo: 'support@aram.events' };

describe('Zoho CPaaS delivery', () => {
  test('sends from arambts@aram.events with the documented request shape', async () => {
    process.env.ZOHO_CPAAS_SEND_MAIL_TOKEN = 'test-token';
    const result = await sendPlatformEmail(MAIL);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://cpaas.zoho.in/v1.1/email');
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Zoho-enczapikey test-token');
    assert.deepEqual(JSON.parse(calls[0].init.body as string), {
      from: { address: 'arambts@aram.events', name: 'Aram Events' },
      to: [{ email_address: { address: 'organizer@example.com' } }],
      reply_to: [{ address: 'support@aram.events' }],
      subject: 'Code',
      textbody: 'Your code',
      htmlbody: '<b>Your code</b>',
    });
    assert.deepEqual(result, { success: true, messageId: 'req-1' });
  });

  test('a sender left over from another provider does not replace the Zoho sender', async () => {
    process.env.ZOHO_CPAAS_SEND_MAIL_TOKEN = 'test-token';
    process.env.PLATFORM_SMTP_FROM = 'old-sender@example.com';
    await sendPlatformEmail(MAIL);
    assert.equal(JSON.parse(calls[0].init.body as string).from.address, 'arambts@aram.events');
  });

  test('takes priority over Brevo, and accepts a token pasted with its scheme prefix', async () => {
    process.env.ZOHO_CPAAS_SEND_MAIL_TOKEN = ' Zoho-enczapikey test-token\n';
    process.env.BREVO_API_KEY = 'brevo-key';
    process.env.PLATFORM_SMTP_FROM = 'old-sender@example.com';
    await sendPlatformEmail(MAIL);
    assert.equal(calls[0].url, 'https://cpaas.zoho.in/v1.1/email');
    assert.equal((calls[0].init.headers as Record<string, string>).authorization, 'Zoho-enczapikey test-token');
  });

  test('a rejected send throws the Zoho error without exposing the token', async () => {
    process.env.ZOHO_CPAAS_SEND_MAIL_TOKEN = 'test-token';
    respond = () =>
      new Response(JSON.stringify({ data: { error_code: 'TM_3004', message: 'Invalid request' } }), { status: 400 });
    await assert.rejects(sendPlatformEmail(MAIL), (err: Error) => {
      assert.match(err.message, /Zoho CPaaS API 400.*TM_3004/);
      assert.doesNotMatch(err.message, /test-token/);
      return true;
    });
  });
});

describe('verification email', () => {
  test('carries the code in the subject, shows the hosted logo, and keeps the code unbroken', async () => {
    process.env.ZOHO_CPAAS_SEND_MAIL_TOKEN = 'test-token';
    await sendOrganizerVerificationEmail('organizer@example.com', '824435', 10);

    const body = JSON.parse(calls[0].init.body as string);
    assert.equal(body.subject, '824435 is your Aram Events verification code');
    assert.match(body.htmlbody, /<img src="https:\/\/[^"]+\/aram-logo\.png"/);
    assert.doesNotMatch(body.htmlbody, /✦/);
    assert.match(body.htmlbody, />824435<\/span>/);
    assert.match(body.textbody, /^824435$/m);
    // The code only travels in the fragment, which browsers never send to the server.
    assert.match(body.htmlbody, /href="[^"]*\/organizer\/verify\?email=organizer%40example\.com#code=824435"[^>]*>Copy code<\/a>/);
  });
});

describe('password reset email', () => {
  test('names the account, links to the reset page, and sends from the platform address', async () => {
    process.env.ZOHO_CPAAS_SEND_MAIL_TOKEN = 'test-token';
    const url = 'https://auth.example/verify?token=abc&type=recovery';
    await sendPasswordResetEmail('organizer@example.com', url);

    const body = JSON.parse(calls[0].init.body as string);
    assert.equal(body.from.address, 'arambts@aram.events');
    assert.equal(body.subject, 'Reset your Aram Events password');
    assert.match(body.htmlbody, /<img src="https:\/\/[^"]+\/aram-logo\.png"/);
    assert.match(body.htmlbody, />organizer@example\.com<\/p>/);
    assert.ok(body.htmlbody.includes('href="https://auth.example/verify?token=abc&amp;type=recovery"'));
    assert.ok(body.textbody.includes(url));
    assert.match(body.htmlbody, /How to reset your password/);
    assert.doesNotMatch(body.htmlbody, /\{\{/);
  });
});
