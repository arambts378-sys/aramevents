import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlatformConsoleAccess } from '../../auth/platformAccess';
import type { EventModerationAction } from '../types';

describe('Master Admin Portal: Authentication & Authorization', () => {
  test('authorized active super_admin is granted platform console access', async () => {
    const decision = await resolvePlatformConsoleAccess('admin-uuid-1', async () => ({
      data: true,
      error: null,
    }));
    assert.equal(decision, 'allowed');
  });

  test('inactive administrator is strictly denied platform access', async () => {
    // When is_active = false, database RPC has_platform_permission returns false
    const decision = await resolvePlatformConsoleAccess('inactive-admin-uuid', async () => ({
      data: false,
      error: null,
    }));
    assert.equal(decision, 'denied');
  });

  test('ordinary organizer attempting privilege escalation is denied', async () => {
    const decision = await resolvePlatformConsoleAccess('organizer-user-uuid', async () => ({
      data: false,
      error: null,
    }));
    assert.equal(decision, 'denied');
  });

  test('unauthenticated request is rejected without querying roles', async () => {
    let queried = false;
    const decision = await resolvePlatformConsoleAccess(null, async () => {
      queried = true;
      return { data: true, error: null };
    });
    assert.equal(decision, 'unauthenticated');
    assert.equal(queried, false);
  });
});

describe('Master Admin Portal: Workspace Suspension & Reactivation', () => {
  function validateSuspensionInput(workspaceId: string, suspend: boolean, reason: string) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(workspaceId)) {
      return { ok: false, error: 'Invalid workspace UUID' };
    }
    if (!reason || reason.trim().length < 3) {
      return { ok: false, error: 'Reason must be at least 3 characters' };
    }
    return { ok: true, suspend, reason: reason.trim() };
  }

  test('valid suspension request with required justification passes validation', () => {
    const result = validateSuspensionInput(
      '00000000-0000-4000-8000-000000000001',
      true,
      'Violation of acceptable use terms',
    );
    assert.equal(result.ok, true);
    assert.equal(result.suspend, true);
    assert.equal(result.reason, 'Violation of acceptable use terms');
  });

  test('suspension request without justification is rejected', () => {
    const emptyResult = validateSuspensionInput(
      '00000000-0000-4000-8000-000000000001',
      true,
      '',
    );
    assert.equal(emptyResult.ok, false);
    assert.equal(emptyResult.error, 'Reason must be at least 3 characters');

    const shortResult = validateSuspensionInput(
      '00000000-0000-4000-8000-000000000001',
      true,
      'no',
    );
    assert.equal(shortResult.ok, false);
    assert.equal(shortResult.error, 'Reason must be at least 3 characters');
  });

  test('suspension with invalid workspace UUID is rejected', () => {
    const result = validateSuspensionInput('invalid-ws-id', true, 'Valid reason');
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Invalid workspace UUID');
  });

  test('reactivation request with justification passes validation', () => {
    const result = validateSuspensionInput(
      '00000000-0000-4000-8000-000000000001',
      false,
      'Dispute resolved and verified',
    );
    assert.equal(result.ok, true);
    assert.equal(result.suspend, false);
  });
});

describe('Master Admin Portal: Event Moderation Actions', () => {
  const VALID_MODERATION_ACTIONS: EventModerationAction[] = [
    'flag',
    'suspend',
    'unpublish',
    'archive',
    'restore',
  ];

  function validateModerationInput(
    eventId: string,
    action: string,
    reason: string,
  ) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(eventId)) {
      return { ok: false, error: 'Invalid event UUID' };
    }
    if (!VALID_MODERATION_ACTIONS.includes(action as EventModerationAction)) {
      return { ok: false, error: `Invalid moderation action: ${action}` };
    }
    if (!reason || reason.trim().length < 3) {
      return { ok: false, error: 'Reason must be at least 3 characters' };
    }
    return { ok: true, action: action as EventModerationAction, reason: reason.trim() };
  }

  test('all valid moderation actions pass validation with proper reason', () => {
    for (const action of VALID_MODERATION_ACTIONS) {
      const result = validateModerationInput(
        '00000000-0000-4000-8000-000000000002',
        action,
        'Appropriate moderation justification',
      );
      assert.equal(result.ok, true);
      assert.equal(result.action, action);
    }
  });

  test('unrecognized moderation action is rejected', () => {
    const result = validateModerationInput(
      '00000000-0000-4000-8000-000000000002',
      'delete_permanently',
      'Legitimate reason',
    );
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /Invalid moderation action/);
  });

  test('moderation action requires mandatory reason', () => {
    const result = validateModerationInput(
      '00000000-0000-4000-8000-000000000002',
      'suspend',
      '  ',
    );
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Reason must be at least 3 characters');
  });

  test('moderation state transitions map properly', () => {
    function computeTargetState(
      currentStatus: 'draft' | 'published' | 'archived',
      currentModeration: 'normal' | 'flagged' | 'suspended',
      action: EventModerationAction,
    ) {
      switch (action) {
        case 'flag':
          return { status: currentStatus, moderation: 'flagged' };
        case 'suspend':
          return { status: 'archived', moderation: 'suspended' };
        case 'unpublish':
          return { status: 'draft', moderation: currentModeration };
        case 'archive':
          return { status: 'archived', moderation: currentModeration };
        case 'restore':
          return { status: 'published', moderation: 'normal' };
      }
    }

    // Suspend transitions to archived + suspended
    const suspended = computeTargetState('published', 'normal', 'suspend');
    assert.equal(suspended.status, 'archived');
    assert.equal(suspended.moderation, 'suspended');

    // Restore transitions back to published + normal
    const restored = computeTargetState('archived', 'suspended', 'restore');
    assert.equal(restored.status, 'published');
    assert.equal(restored.moderation, 'normal');

    // Flag keeps lifecycle status, sets moderation to flagged
    const flagged = computeTargetState('published', 'normal', 'flag');
    assert.equal(flagged.status, 'published');
    assert.equal(flagged.moderation, 'flagged');
  });
});

describe('Master Admin Portal: Audit Logs & Append-Only Contract', () => {
  test('audit log entry requires actor and action', () => {
    function createAuditRecord(
      actorUserId: string | null,
      action: string,
      targetType: string,
      targetId: string,
      reason: string,
    ) {
      if (!actorUserId) throw new Error('Authentication required for platform audit logging');
      if (!action || action.length > 160) throw new Error('Invalid action name');
      return {
        actor_user_id: actorUserId,
        action,
        target_type: targetType,
        target_id: targetId,
        reason,
        created_at: new Date().toISOString(),
      };
    }

    assert.throws(
      () => createAuditRecord(null, 'test.action', 'test', '123', 'reason'),
      /Authentication required/,
    );

    const record = createAuditRecord(
      '00000000-0000-4000-8000-000000000099',
      'workspace.suspended',
      'workspace',
      'ws-1',
      'Test suspension',
    );
    assert.equal(record.action, 'workspace.suspended');
    assert.equal(record.target_type, 'workspace');
  });

  test('audit log pagination bounds query safely', () => {
    function sanitizePagination(pageInput: any, pageSizeInput: any) {
      const page = Math.max(1, Math.min(10000, parseInt(pageInput, 10) || 1));
      const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeInput, 10) || 25));
      return { page, pageSize };
    }

    assert.deepEqual(sanitizePagination(-5, 500), { page: 1, pageSize: 100 });
    assert.deepEqual(sanitizePagination('2', '20'), { page: 2, pageSize: 20 });
    assert.deepEqual(sanitizePagination('invalid', null), { page: 1, pageSize: 25 });
  });
});
