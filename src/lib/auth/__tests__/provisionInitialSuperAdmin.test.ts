import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { provisionInitialSuperAdmin } from '../provisionInitialSuperAdmin';

const OPERATOR_ID = '00000000-0000-4000-8000-000000000001';
const TARGET_ID = '00000000-0000-4000-8000-000000000002';

describe('initial Super Admin provisioning', () => {
  test('provisions only verified existing accounts through the operator RPC', async () => {
    const confirmedUsers = new Set([OPERATOR_ID, TARGET_ID]);
    let rpcCalls = 0;
    const result = await provisionInitialSuperAdmin(OPERATOR_ID, TARGET_ID, {
      async getConfirmedUser(userId) {
        return confirmedUsers.has(userId) ? userId : null;
      },
      async provision(actorUserId, targetUserId) {
        rpcCalls++;
        assert.equal(actorUserId, OPERATOR_ID);
        assert.equal(targetUserId, TARGET_ID);
        return { data: true, error: null };
      },
    });
    assert.equal(result, 'provisioned');
    assert.equal(rpcCalls, 1);
  });

  test('recognizes a repeated provisioning attempt as idempotent', async () => {
    const result = await provisionInitialSuperAdmin(OPERATOR_ID, TARGET_ID, {
      async getConfirmedUser(userId) {
        return userId;
      },
      async provision() {
        return { data: false, error: null };
      },
    });
    assert.equal(result, 'already-provisioned');
  });

  test('rejects invalid IDs and non-existing or unconfirmed accounts before calling the RPC', async () => {
    let rpcCalls = 0;
    const dependencies = {
      async getConfirmedUser() {
        return null;
      },
      async provision() {
        rpcCalls++;
        return { data: true, error: null };
      },
    };

    await assert.rejects(
      provisionInitialSuperAdmin('not-a-uuid', TARGET_ID, dependencies),
      /valid UUIDs/,
    );
    await assert.rejects(
      provisionInitialSuperAdmin(OPERATOR_ID, TARGET_ID, dependencies),
      /existing confirmed Auth accounts/,
    );
    assert.equal(rpcCalls, 0);
  });

  test('surfaces provisioning RPC failures and rejects indeterminate results', async () => {
    const dependencies = {
      async getConfirmedUser(userId: string) {
        return userId;
      },
      async provision() {
        return { data: null, error: { message: 'target conflicts with existing role' } };
      },
    };
    await assert.rejects(
      provisionInitialSuperAdmin(OPERATOR_ID, TARGET_ID, dependencies),
      /target conflicts/,
    );
    await assert.rejects(
      provisionInitialSuperAdmin(OPERATOR_ID, TARGET_ID, {
        ...dependencies,
        async provision() {
          return { data: null, error: null };
        },
      }),
      /invalid result/,
    );
  });
});
