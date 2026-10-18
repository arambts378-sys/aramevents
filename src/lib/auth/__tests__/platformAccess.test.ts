import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlatformConsoleAccess } from '../platformAccess';

describe('platform console authorization', () => {
  test('unauthenticated requests are rejected without a role lookup', async () => {
    let lookedUp = false;
    const result = await resolvePlatformConsoleAccess(null, async () => {
      lookedUp = true;
      return { data: true, error: null };
    });
    assert.equal(result, 'unauthenticated');
    assert.equal(lookedUp, false);
  });

  test('ordinary users, including workspace owners and admins, are denied without a platform grant', async () => {
    const owner = await resolvePlatformConsoleAccess('owner-user-id', async () => ({ data: false, error: null }));
    const admin = await resolvePlatformConsoleAccess('admin-user-id', async () => ({ data: false, error: null }));
    assert.equal(owner, 'denied');
    assert.equal(admin, 'denied');
  });

  test('only an explicit platform permission grants console access', async () => {
    const supportWithConsolePermission = await resolvePlatformConsoleAccess('support-user-id', async () => ({
      data: true,
      error: null,
    }));
    const superAdmin = await resolvePlatformConsoleAccess('super-admin-user-id', async () => ({
      data: true,
      error: null,
    }));
    assert.equal(supportWithConsolePermission, 'allowed');
    assert.equal(superAdmin, 'allowed');
  });

  test('missing and failed role lookups deny access', async () => {
    const missing = await resolvePlatformConsoleAccess('unassigned-user-id', async () => ({
      data: false,
      error: null,
    }));
    const failed = await resolvePlatformConsoleAccess('lookup-failure-user-id', async () => ({
      data: null,
      error: { message: 'database unavailable' },
    }));
    const thrown = await resolvePlatformConsoleAccess('thrown-lookup-user-id', async () => {
      throw new Error('network failure');
    });
    assert.equal(missing, 'denied');
    assert.equal(failed, 'denied');
    assert.equal(thrown, 'denied');
  });
});
