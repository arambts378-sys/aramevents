import assert from 'node:assert/strict';
import test from 'node:test';
import { checkCronAuthorization } from '../cronAuthorization';
import { isPublicRegistrationEnabled } from '../publicRegistration';

test('public registration requires an explicit enabled settings row', () => {
  assert.equal(isPublicRegistrationEnabled(null), false);
  assert.equal(isPublicRegistrationEnabled(undefined), false);
  assert.equal(isPublicRegistrationEnabled({ is_enabled: false }), false);
  assert.equal(isPublicRegistrationEnabled({ is_enabled: true }), true);
});

test('cron processing fails closed when its secret is missing or invalid', () => {
  assert.equal(checkCronAuthorization('Bearer secret', undefined), 'misconfigured');
  assert.equal(checkCronAuthorization(null, 'secret'), 'unauthorized');
  assert.equal(checkCronAuthorization('Basic secret', 'secret'), 'unauthorized');
  assert.equal(checkCronAuthorization('Bearer wrong', 'secret'), 'unauthorized');
  assert.equal(checkCronAuthorization('Bearer longer', 'secret'), 'unauthorized');
  assert.equal(checkCronAuthorization('Bearer secret', 'secret'), 'authorized');
});
