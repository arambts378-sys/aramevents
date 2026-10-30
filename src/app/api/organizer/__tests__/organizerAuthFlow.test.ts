/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Route-level tests for organizer registration (no email-code step).
 * Runs the REAL route handler against an in-memory model of Supabase
 * (see fakeSupabase.ts). Run: npm run test:auth
 *
 * These prove application logic. They do not prove behaviour of a real Postgres/GoTrue instance.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { FakeSupabase } from './fakeSupabase';
import { POST as registerPOST } from '../register/route';

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

describe('registration', () => {
  test('1. valid registration creates an active organizer with their organization and signs them in', async () => {
    const r = await register({ email: '  Asha@Example.COM ' });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.redirect, '/app');

    const user = db.userByEmail('asha@example.com');
    assert.ok(user, 'email is normalized before lookup/creation');
    assert.ok(user.email_confirmed_at, 'no email-code step: the account is active immediately');
    assert.equal(user.user_metadata.phone, '+919876543210');
    assert.equal(user.user_metadata.full_name, 'Asha Rao');
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.tables.workspaces[0].name, 'Acme Events');
    assert.equal(db.tables.profiles[0].phone, '+919876543210');
    assert.deepEqual(db.signIns, ['asha@example.com']);
    // The password is never echoed back
    assert.doesNotMatch(JSON.stringify(r.body), /ExamplePass123/);
  });

  test('the account stays active when the session cannot be established; the organizer signs in manually', async () => {
    db.failSignIn = true;
    const r = await register();
    assert.equal(r.status, 200);
    assert.equal(r.body.redirect, '/login');
    assert.ok(db.userByEmail('asha@example.com')!.email_confirmed_at);
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
  test('9. registering an existing account changes nothing and asks the person to sign in', async () => {
    await register();
    const existing = db.userByEmail('asha@example.com')!;
    const countsBefore = db.provisioningCounts(existing.id);
    const workspacesBefore = JSON.stringify(db.tables.workspaces);
    const updatesBefore = db.updateUserCalls.length;

    const dup = await register({
      fullName: 'Mallory',
      organizationName: 'Evil Corp',
      phoneNumber: '9000000000',
      password: 'AttackerPass999',
      confirmPassword: 'AttackerPass999',
    });
    assert.equal(dup.status, 409);
    assert.match(dup.body.error, /already exists/);
    assert.ok(dup.body.fieldErrors?.email);

    assert.equal(db.users.filter((u) => u.email === 'asha@example.com').length, 1);
    assert.deepEqual(db.provisioningCounts(existing.id), countsBefore);
    assert.equal(JSON.stringify(db.tables.workspaces), workspacesBefore);
    assert.equal(existing.password, 'ExamplePass123', 'password must not be overwritten');
    assert.equal(existing.user_metadata.full_name, 'Asha Rao');
    assert.equal(existing.user_metadata.phone, '+919876543210');
    assert.equal(db.updateUserCalls.length, updatesBefore, 'existing account must not be updated');
    assert.deepEqual(db.signIns, ['asha@example.com'], 'no session for the duplicate attempt');
  });

  test('10. an unfinished account (left by the old email-code flow) is completed by registering again', async () => {
    await db.client().auth.admin.createUser({
      email: 'asha@example.com',
      password: 'OldPendingPass1',
      email_confirm: false,
      user_metadata: { full_name: 'Old Name', organization_name: 'Old Org', phone: '+919876543210' },
    });
    const user = db.userByEmail('asha@example.com')!;
    const countsBefore = db.provisioningCounts(user.id);

    const r = await register({ organizationName: 'New Org', password: 'NewPass456', confirmPassword: 'NewPass456' });
    assert.equal(r.status, 200);
    assert.equal(db.users.length, 1);
    assert.deepEqual(db.provisioningCounts(user.id), countsBefore);
    assert.deepEqual(countsBefore, { profiles: 1, workspaces: 1, memberships: 1 });
    assert.ok(user.email_confirmed_at);
    assert.equal(user.password, 'NewPass456', 'the password from this registration is bound');
    assert.equal(user.user_metadata.organization_name, 'New Org');
    assert.equal(db.tables.workspaces[0].name, 'New Org');
    assert.deepEqual(db.signIns, ['asha@example.com']);
  });

  test('11. repeated and simultaneous submissions create exactly one user/workspace/membership', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => register()));
    for (const r of results) assert.ok([200, 409].includes(r.status), `unexpected ${r.status}`);
    assert.ok(results.some((r) => r.status === 200));

    assert.equal(db.users.length, 1, 'Supabase Auth uniqueness allows exactly one user');
    const user = db.users[0];
    assert.ok(user.email_confirmed_at);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.tables.workspaces.length, 1);
    assert.equal(db.tables.workspace_members.length, 1);
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

  test('19. provisioning failure leaves the account unfinished and a retry completes it without duplicates', async () => {
    db.failTable = { table: 'workspace_members', op: 'upsert', times: 1 };
    const first = await register();
    assert.equal(first.status, 500);
    assert.doesNotMatch(JSON.stringify(first.body), /injected|internal/);
    const user = db.userByEmail('asha@example.com')!;
    assert.equal(user.email_confirmed_at, null, 'must stay unfinished so it can be retried');
    assert.deepEqual(db.signIns, []);

    const second = await register();
    assert.equal(second.status, 200);
    assert.ok(user.email_confirmed_at);
    assert.equal(db.users.length, 1);
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
  });

  test('fallback provisioning (trigger missing) creates exactly one profile, workspace and membership', async () => {
    db.triggerEnabled = false;
    const r = await register();
    assert.equal(r.status, 200);
    const user = db.userByEmail('asha@example.com')!;
    assert.deepEqual(db.provisioningCounts(user.id), { profiles: 1, workspaces: 1, memberships: 1 });
    assert.equal(db.tables.profiles[0].phone, '+919876543210');
  });
});

describe('existing users', () => {
  test('17. an existing verified user is untouched by registration (credentials preserved)', async () => {
    // Pre-existing user created before this change (confirmed, with workspace via trigger)
    await db.client().auth.admin.createUser({
      email: 'legacy@example.com',
      password: 'LegacyPass123',
      email_confirm: true,
      user_metadata: { full_name: 'Legacy User' },
    });
    const legacy = db.userByEmail('legacy@example.com')!;
    const counts = db.provisioningCounts(legacy.id);

    assert.equal((await register({ email: 'legacy@example.com' })).status, 409);

    assert.equal(legacy.password, 'LegacyPass123');
    assert.ok(legacy.email_confirmed_at);
    assert.deepEqual(db.provisioningCounts(legacy.id), counts);
    assert.equal(db.updateUserCalls.length, 0);
  });
});
