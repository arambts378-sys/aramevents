/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Route-level tests for organizer registration, verification and resend.
 * Runs the REAL route handlers and OTP service against an in-memory model of Supabase
 * (see fakeSupabase.ts). Run: npm run test:auth
 *
 * These prove application logic. They do not prove behaviour of a real Postgres/GoTrue instance.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { FakeSupabase } from './fakeSupabase';
import { POST as registerPOST } from '../register/route';
import { POST as verifyPOST } from '../verify/route';
import { POST as resendPOST } from '../resend/route';

let db: FakeSupabase;

beforeEach(() => {
  db = new FakeSupabase();
  (globalThis as any).__authTest = db;
});

function req(path: string, body: unknown, ip = '203.0.113.7') {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID = {
  fullName: 'Asha Rao',
  organizationName: 'Acme Events',
  email: 'asha@example.com',
  phoneNumber: '+91 98765 43210',
  password: 'ExamplePass123',
  confirmPassword: 'ExamplePass123',
};

async function register(overrides: Record<string, unknown> = {}, ip?: string) {
  const res = await registerPOST(req('/api/organizer/register', { ...VALID, ...overrides }, ip));
  return { status: res.status, body: await res.json() };
}
async function verify(email: string, otp: string) {
  const res = await verifyPOST(req('/api/organizer/verify', { email, otp }));
  return { status: res.status, body: await res.json() };
}
async function resend(email: string, ip?: string) {
  const res = await resendPOST(req('/api/organizer/resend', { email }, ip));
  return { status: res.status, body: await res.json() };
}

describe('registration', () => {
  test('1. valid registration creates one pending user, stores the E.164 phone, sends an OTP', async () => {
    const r = await register({ email: '  Asha@Example.COM ' });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);

    const user = db.userByEmail('asha@example.com');
    assert.ok(user, 'email is normalized before lookup/creation');
    assert.equal(user.email_confirmed_at, null, 'must not be confirmed before OTP');
    assert.equal(user.user_metadata.phone, '+919876543210');
    assert.equal(user.user_metadata.full_name, 'Asha Rao');
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.mailbox.filter((m) => m.type === 'otp').length, 1);
    assert.match(db.latestOtp('asha@example.com') as string, /^\d{6}$/);
    // The password is never echoed back
    assert.doesNotMatch(JSON.stringify(r.body), /ExamplePass123/);
  });

  for (const [label, overrides, field] of [
    ['2. missing mobile number', { phoneNumber: '' }, 'phoneNumber'],
    ['2b. mobile number absent', { phoneNumber: undefined }, 'phoneNumber'],
    ['3. invalid mobile number', { phoneNumber: '98765abcde' }, 'phoneNumber'],
    ['3b. whitespace-only mobile number', { phoneNumber: '     ' }, 'phoneNumber'],
    ['4. missing password', { password: '', confirmPassword: '' }, 'password'],
    ['4b. whitespace-only password', { password: '        ', confirmPassword: '        ' }, 'password'],
    ['5. password below minimum length', { password: 'short1', confirmPassword: 'short1' }, 'password'],
    ['server rejects mismatched confirmation', { confirmPassword: 'ExamplePass12' }, 'confirmPassword'],
  ] as const) {
    test(`${label} -> 400 with field error, no account provisioned`, async () => {
      const r = await register(overrides as any);
      assert.equal(r.status, 400);
      assert.ok(r.body.fieldErrors?.[field], `expected fieldErrors.${field}`);
      assert.equal(db.users.length, 0);
      assert.equal(db.createUserCalls, 0, 'must reject before touching Supabase Auth');
      assert.equal(db.tables.workspaces.length, 0);
      assert.equal(db.mailbox.length, 0);
    });
  }

  test('weak password rejected by Supabase Auth policy maps to a safe password error', async () => {
    db.weakPasswords.add('ExamplePass123');
    const r = await register();
    assert.equal(r.status, 400);
    assert.ok(r.body.fieldErrors.password);
    assert.equal(db.users.length, 0);
  });

  test('malformed JSON body is a 400, not a 500', async () => {
    const res = await registerPOST(req('/api/organizer/register', '{not json'));
    assert.equal(res.status, 400);
  });
});

describe('duplicate accounts', () => {
  test('9. registering an already-verified email creates nothing, changes nothing, and looks identical', async () => {
    // Existing, verified account
    await register();
    const otp = db.latestOtp('asha@example.com') as string;
    assert.equal((await verify('asha@example.com', otp)).status, 200);
    const existing = db.userByEmail('asha@example.com')!;
    const countsBefore = db.provisioningCounts(existing.id);
    const workspaceBefore = JSON.stringify(db.tables.workspaces);
    const updatesBefore = db.updateUserCalls.length;
    const mailBefore = db.mailbox.length;

    // Duplicate attempt inside the cooldown window: accepted identically, nothing is sent
    const early = await register({ password: 'AttackerPass999', confirmPassword: 'AttackerPass999' });
    assert.equal(early.status, 200);
    assert.equal(db.mailbox.length, mailBefore);

    // Duplicate attempt later, with different password, name, org and phone
    db.ageChallenges('asha@example.com', 120);
    const dup = await register({
      fullName: 'Mallory',
      organizationName: 'Evil Corp',
      phoneNumber: '9000000000',
      password: 'AttackerPass999',
      confirmPassword: 'AttackerPass999',
    });
    const fresh = await register({ email: 'brand-new@example.com' });

    // Anti-enumeration: same status, same message and same body shape as a brand-new registration
    assert.equal(dup.status, fresh.status);
    assert.equal(dup.body.message, fresh.body.message);
    assert.deepEqual(Object.keys(dup.body).sort(), Object.keys(fresh.body).sort());
    assert.equal(dup.body.existingConfirmed, undefined);

    // Nothing was created or modified for the existing account
    assert.equal(db.users.filter((u) => u.email === 'asha@example.com').length, 1);
    assert.deepEqual(db.provisioningCounts(existing.id), countsBefore);
    assert.deepEqual(countsBefore, { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(JSON.stringify(db.tables.workspaces.slice(0, 1)), JSON.stringify(JSON.parse(workspaceBefore).slice(0, 1)));
    assert.equal(existing.password, 'ExamplePass123', 'password must not be overwritten');
    assert.equal(existing.user_metadata.full_name, 'Asha Rao');
    assert.equal(existing.user_metadata.phone, '+919876543210');
    assert.equal(db.updateUserCalls.length, updatesBefore, 'existing account must not be updated');

    // The mailbox owner is told they already have an account; no OTP is issued for it
    const newMail = db.mailbox.slice(mailBefore).filter((m) => m.to === 'asha@example.com');
    assert.deepEqual(newMail.map((m) => m.type), ['notice']);
  });

  test('10. retrying a partially completed registration reuses the pending account', async () => {
    await register();
    const user = db.userByEmail('asha@example.com')!;
    const countsAfterFirst = db.provisioningCounts(user.id);

    // User comes back later (cooldown elapsed) with different details
    db.ageChallenges('asha@example.com', 120);
    const retry = await register({
      fullName: 'Someone Else',
      organizationName: 'Other Org',
      password: 'DifferentPass456',
      confirmPassword: 'DifferentPass456',
    });
    assert.equal(retry.status, 200);

    assert.equal(db.users.length, 1);
    assert.deepEqual(db.provisioningCounts(user.id), countsAfterFirst);
    assert.deepEqual(countsAfterFirst, { profiles: 1, workspaces: 1, memberships: 1 });
    // Pending account is not mutated by an unauthenticated request (no takeover of a pending signup)
    assert.equal(user.password, 'ExamplePass123');
    assert.equal(user.user_metadata.organization_name, 'Acme Events');
    assert.equal(db.updateUserCalls.length, 0);
    // A fresh code is issued, and it is the one that works
    const otps = db.mailbox.filter((m) => m.type === 'otp');
    assert.equal(otps.length, 2);
    assert.equal((await verify('asha@example.com', otps[1].otp!)).status, 200);
  });

  test('registration retry after a failed email delivery does not duplicate anything', async () => {
    db.failMailTimes = 1;
    const first = await register();
    assert.equal(first.status, 500);
    assert.doesNotMatch(JSON.stringify(first.body), /smtp|internal|587/i, 'SMTP details must not leak');

    const user = db.userByEmail('asha@example.com')!;
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });

    db.ageChallenges('asha@example.com', 120);
    const second = await register();
    assert.equal(second.status, 200);
    assert.equal(db.users.length, 1);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.mailbox.filter((m) => m.type === 'otp').length, 1);
  });

  test('11. repeated and simultaneous submissions create exactly one user/workspace/membership', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => register()));
    for (const r of results) assert.equal(r.status, 200);

    assert.equal(db.users.length, 1, 'Supabase Auth uniqueness allows exactly one user');
    const user = db.users[0];
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.tables.workspaces.length, 1);
    assert.equal(db.tables.workspace_members.length, 1);
    assert.equal(db.mailbox.filter((m) => m.type === 'otp').length, 1);

    // Whatever code was issued last is the one that verifies
    const last = db.latestOtp('asha@example.com') as string;
    assert.ok(last);
    assert.equal((await verify('asha@example.com', last)).status, 200);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
  });

  test('a rapid double submit within the cooldown issues only one code', async () => {
    await register();
    await register();
    assert.equal(db.mailbox.filter((m) => m.type === 'otp').length, 1);
  });
});

describe('error handling', () => {
  test('15. unexpected Supabase failures return a generic message with no internals', async () => {
    db.failCreateUser = { code: 'unexpected_failure', status: 500, message: 'connection to db-host-7.internal refused' };
    const r = await register();
    assert.equal(r.status, 500);
    assert.doesNotMatch(JSON.stringify(r.body), /db-host|internal|refused|unexpected_failure/);
    assert.equal(db.users.length, 0);
  });
});

describe('OTP verification and provisioning', () => {
  test('18. correct OTP verifies, confirms the user once, names the workspace, no duplicates', async () => {
    await register();
    const user = db.userByEmail('asha@example.com')!;
    const otp = db.latestOtp('asha@example.com') as string;

    const v = await verify('asha@example.com', otp);
    assert.equal(v.status, 200);
    assert.equal(v.body.redirect, '/app');
    assert.ok(user.email_confirmed_at);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.tables.profiles[0].phone, '+919876543210');
    assert.equal(db.tables.workspaces[0].name, 'Acme Events');

    // Replay of the same code is rejected
    const replay = await verify('asha@example.com', otp);
    assert.equal(replay.status, 400);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
  });

  test('OTP is still required: wrong code fails, locks after max attempts, account stays unconfirmed', async () => {
    await register();
    const user = db.userByEmail('asha@example.com')!;
    const otp = db.latestOtp('asha@example.com') as string;
    const wrong = otp === '123456' ? '654321' : '123456';

    for (let i = 0; i < 5; i++) {
      const r = await verify('asha@example.com', wrong);
      assert.equal(r.status, 400);
    }
    // Even the correct code is now refused
    assert.equal((await verify('asha@example.com', otp)).status, 400);
    assert.equal(user.email_confirmed_at, null);
  });

  test('verification never bypasses OTP for an email with no challenge', async () => {
    const r = await verify('nobody@example.com', '123456');
    assert.equal(r.status, 400);
  });

  test('an already-verified account cannot be re-verified or re-provisioned', async () => {
    await register();
    const user = db.userByEmail('asha@example.com')!;
    await verify('asha@example.com', db.latestOtp('asha@example.com') as string);

    // Fabricate a stale valid challenge for the verified email via resend path
    db.ageChallenges('asha@example.com', 120);
    const rs = await resend('asha@example.com');
    assert.equal(rs.status, 200);
    assert.equal(db.mailbox.filter((m) => m.type === 'otp').length, 1, 'no new OTP for verified accounts');
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
  });

  test('19. provisioning failure leaves the account pending and a retry does not duplicate', async () => {
    await register();
    const user = db.userByEmail('asha@example.com')!;
    db.failTable = { table: 'workspace_members', op: 'upsert', times: 1 };

    const first = await verify('asha@example.com', db.latestOtp('asha@example.com') as string);
    assert.equal(first.status, 500);
    assert.doesNotMatch(JSON.stringify(first.body), /injected|internal/);
    assert.equal(user.email_confirmed_at, null, 'must stay unconfirmed so it can be retried');

    // Request a new code and retry
    db.ageChallenges('asha@example.com', 120);
    assert.equal((await resend('asha@example.com')).status, 200);
    const second = await verify('asha@example.com', db.latestOtp('asha@example.com') as string);
    assert.equal(second.status, 200);
    assert.ok(user.email_confirmed_at);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
  });

  test('fallback provisioning (trigger missing) creates exactly one profile, workspace and membership', async () => {
    db.triggerEnabled = false;
    await register();
    const user = db.userByEmail('asha@example.com')!;
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 0, workspaces: 0, memberships: 0 });

    const v = await verify('asha@example.com', db.latestOtp('asha@example.com') as string);
    assert.equal(v.status, 200);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.tables.profiles[0].phone, '+919876543210');
  });

  test('simultaneous verification requests consume the OTP once', async () => {
    await register();
    const otp = db.latestOtp('asha@example.com') as string;
    const results = await Promise.all([verify('asha@example.com', otp), verify('asha@example.com', otp)]);
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    assert.equal(results.filter((result) => result.status === 400).length, 1);
    assert.deepEqual(db.provisioningCounts(db.userByEmail('asha@example.com')!.id), {
      profiles: 1,
      workspaces: 1,
      memberships: 1,
    });
  });

  test('H5 regression: concurrent incorrect OTP attempts lock out cleanly within max attempts', async () => {
    await register();
    const user = db.userByEmail('asha@example.com')!;
    const otp = db.latestOtp('asha@example.com') as string;
    const wrong = otp === '123456' ? '654321' : '123456';

    // 10 concurrent bad guesses
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => verify('asha@example.com', wrong))
    );
    // All 10 must fail
    assert.equal(results.every((r) => r.status === 400), true);

    // Any subsequent attempt, even with the correct code, must fail due to lock out
    const subsequent = await verify('asha@example.com', otp);
    assert.equal(subsequent.status, 400);
    assert.equal(user.email_confirmed_at, null, 'account remains unconfirmed');
  });

  test('H6 regression: unfinished registration by attacker has password replaced upon legitimate owner verification', async () => {
    // 1. Attacker registers victim email with attacker password
    const attackerReg = await register({
      email: 'victim@example.com',
      password: 'AttackerPassword123!',
      confirmPassword: 'AttackerPassword123!',
      fullName: 'Attacker Impersonator',
      organizationName: 'Attacker Org',
    });
    assert.equal(attackerReg.status, 200);
    const user = db.userByEmail('victim@example.com')!;
    assert.equal(user.password, 'AttackerPassword123!');
    assert.equal(user.email_confirmed_at, null);

    // 2. Legitimate user later registers same email with legitimate password
    db.ageChallenges('victim@example.com', 120); // age past cooldown
    const legitimateReg = await register({
      email: 'victim@example.com',
      password: 'LegitimatePassword456!',
      confirmPassword: 'LegitimatePassword456!',
      fullName: 'Real Victim Owner',
      organizationName: 'Real Victim Org',
    });
    assert.equal(legitimateReg.status, 200);

    // 3. Legitimate user verifies with the OTP sent to their email
    const otp = db.latestOtp('victim@example.com') as string;
    const verifyRes = await verify('victim@example.com', otp);
    assert.equal(verifyRes.status, 200);
    assert.ok(user.email_confirmed_at);

    // 4. Crucial H6 check: user password MUST now be LegitimatePassword456!, NOT AttackerPassword123!
    assert.equal(user.password, 'LegitimatePassword456!');
    assert.equal(user.user_metadata.full_name, 'Real Victim Owner');
    assert.equal(user.user_metadata.organization_name, 'Real Victim Org');
  });
});

describe('resend', () => {
  test('18b. resend issues a new code for a pending account and honours the cooldown', async () => {
    await register();
    const first = db.latestOtp('asha@example.com') as string;

    const tooSoon = await resend('asha@example.com');
    assert.equal(tooSoon.status, 429);
    assert.match(tooSoon.body.error, /wait/i);

    db.ageChallenges('asha@example.com', 120);
    const ok = await resend('asha@example.com');
    assert.equal(ok.status, 200);
    const second = db.latestOtp('asha@example.com') as string;
    assert.notEqual(second, first);

    // The old code is dead, the new one works
    assert.equal((await verify('asha@example.com', first)).status, 400);
    assert.equal((await verify('asha@example.com', second)).status, 200);
  });

  test('resend does not reveal whether an email has an account and never mails unknown addresses', async () => {
    await register();
    db.ageChallenges('asha@example.com', 120);

    const unknown = await resend('ghost@example.com');
    const pending = await resend('asha@example.com');
    assert.equal(unknown.status, 200);
    assert.equal(unknown.body.message, pending.body.message);
    assert.equal(db.mailbox.filter((m) => m.to === 'ghost@example.com').length, 0);

    // Throttling is uniform too: a second immediate request is limited for unknown emails as well
    const unknownAgain = await resend('ghost@example.com');
    assert.equal(unknownAgain.status, 429);
  });

  test('resend rejects invalid email input', async () => {
    assert.equal((await resend('')).status, 400);
    assert.equal((await resend('nope')).status, 400);
  });

  test('hourly per-email limit stops runaway registration/resend attempts', async () => {
    let limited = false;
    for (let i = 0; i < 8; i++) {
      db.ageChallenges('spam@example.com', 120);
      const r = await resend('spam@example.com', `198.51.100.${i}`);
      if (r.status === 429 && /Too many/.test(r.body.error)) {
        limited = true;
        break;
      }
    }
    assert.equal(limited, true);
  });
});

describe('existing users', () => {
  test('17. an existing verified user is untouched by the new flows (credentials preserved)', async () => {
    // Pre-existing user created before this change (confirmed, with workspace via trigger)
    await db.client().auth.admin.createUser({
      email: 'legacy@example.com',
      password: 'LegacyPass123',
      email_confirm: true,
      user_metadata: { full_name: 'Legacy User' },
    });
    const legacy = db.userByEmail('legacy@example.com')!;
    const counts = db.provisioningCounts(legacy.id);

    await register({ email: 'legacy@example.com' });
    await resend('legacy@example.com');

    assert.equal(legacy.password, 'LegacyPass123');
    assert.ok(legacy.email_confirmed_at);
    assert.deepEqual(db.provisioningCounts(legacy.id), counts);
    assert.equal(db.updateUserCalls.length, 0);
  });
});
