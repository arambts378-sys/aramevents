import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insertActivityBestEffort,
  parseActivityDirectoryQuery,
  resolveActivityCorrelationId,
  sanitizeActivityEvent,
} from '../activity';

const workspaceId = '10000000-0000-4000-8000-000000000001';
const correlationId = '20000000-0000-4000-8000-000000000002';

test('activity event creation sanitizes fields and allowlists metadata', () => {
  const safeEvent = sanitizeActivityEvent({
    workspaceId,
    actorUserId: 'not-a-uuid',
    action: 'integration.delivery_failed',
    outcome: 'failure',
    resourceType: 'integration_job',
    resourceId: 'attendee@example.com',
    errorCode: 'EMAIL_DELIVERY_FAILED',
    correlationId,
    metadata: {
      provider: 'email',
      eventType: 'qr_delivery',
      password: 'must-not-be-captured',
      email: 'attendee@example.com',
      rawBody: '{"token":"secret"}',
    },
  });

  assert.ok(safeEvent);
  assert.equal(safeEvent.category, 'integration');
  assert.equal(safeEvent.severity, 'error');
  assert.equal(safeEvent.actor_user_id, null);
  assert.equal(safeEvent.resource_id, null);
  assert.equal(safeEvent.message, 'Integration delivery failed.');
  assert.deepEqual(safeEvent.metadata, { provider: 'email', eventType: 'qr_delivery' });
  assert.doesNotMatch(JSON.stringify(safeEvent), /must-not-be-captured|attendee@example.com|secret/);
});

test('activity messages are fixed safe text and malformed correlation IDs are rejected', () => {
  const safeEvent = sanitizeActivityEvent({
    action: 'check_in.denied',
    outcome: 'failure',
    correlationId,
    metadata: { reasonCode: 'CHECK_IN_DENIED', arbitrary: 'sensitive value' },
  });
  assert.equal(safeEvent?.message, 'Check-in denied.');
  assert.deepEqual(safeEvent?.metadata, { reasonCode: 'CHECK_IN_DENIED' });
  assert.equal(
    sanitizeActivityEvent({
      action: 'event.created',
      outcome: 'success',
      correlationId: 'not-a-uuid',
    }),
    null,
  );
});

test('correlation IDs preserve only valid request IDs and otherwise generate one', () => {
  assert.equal(resolveActivityCorrelationId(correlationId, () => 'generated'), correlationId);
  assert.equal(resolveActivityCorrelationId('untrusted-header', () => 'generated'), 'generated');
  assert.equal(resolveActivityCorrelationId(null, () => 'generated'), 'generated');
});

test('activity logging failures are reported but do not throw into a successful operation', async () => {
  const safeEvent = sanitizeActivityEvent({
    action: 'event.created',
    outcome: 'success',
    correlationId,
  });
  assert.ok(safeEvent);
  const warnings: string[] = [];
  const result = await insertActivityBestEffort(
    safeEvent,
    async () => {
      throw new Error('private database details');
    },
    (message) => warnings.push(message),
  );

  assert.equal(result, false);
  assert.deepEqual(warnings, ['Activity event could not be persisted.']);
  assert.doesNotMatch(warnings.join(' '), /private database details/);
});

test('activity filters allowlist values and bound search and pagination', () => {
  const query = parseActivityDirectoryQuery({
    workspace: workspaceId,
    category: 'integration',
    action: 'integration.delivery_failed',
    outcome: 'failure',
    severity: 'error',
    from: '2026-10-01',
    to: '2026-10-17',
    correlation: correlationId,
    q: 'x'.repeat(150),
    page: '999999',
  });
  assert.equal(query.workspaceId, workspaceId);
  assert.equal(query.category, 'integration');
  assert.equal(query.action, 'integration.delivery_failed');
  assert.equal(query.outcome, 'failure');
  assert.equal(query.severity, 'error');
  assert.equal(query.from, '2026-10-01');
  assert.equal(query.to, '2026-10-17');
  assert.equal(query.correlationId, correlationId);
  assert.equal(query.search?.length, 100);
  assert.equal(query.page, 10000);

  const invalid = parseActivityDirectoryQuery({
    workspace: 'invalid',
    category: 'untrusted',
    action: 'secret.payload',
    outcome: 'nope',
    severity: 'critical',
    from: '2026-02-30',
    to: '2026-01-01',
    correlation: 'bad',
    page: '-1',
  });
  assert.equal(invalid.workspaceId, null);
  assert.equal(invalid.category, null);
  assert.equal(invalid.action, null);
  assert.equal(invalid.outcome, null);
  assert.equal(invalid.severity, null);
  assert.equal(invalid.from, null);
  assert.equal(invalid.to, '2026-01-01');
  assert.equal(invalid.correlationId, null);
  assert.equal(invalid.page, 1);
});
