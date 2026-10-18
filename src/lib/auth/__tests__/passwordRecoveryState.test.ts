import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PasswordRecoveryState } from '@/lib/auth/passwordRecoveryState';

describe('PasswordRecoveryState', () => {
  it('does not authorize an ordinary authenticated session', () => {
    const state = new PasswordRecoveryState();

    state.handleAuthEvent('INITIAL_SESSION', true);
    state.handleAuthEvent('SIGNED_IN', true);

    let verified = false;
    state.subscribe((value) => {
      verified = value;
    });
    assert.equal(verified, false);
  });

  it('authorizes only a session delivered with PASSWORD_RECOVERY', () => {
    const state = new PasswordRecoveryState();
    state.handleAuthEvent('PASSWORD_RECOVERY', true);
    state.handleAuthEvent('INITIAL_SESSION', true);

    let verified = false;
    state.subscribe((value) => {
      verified = value;
    });
    assert.equal(verified, true);
  });

  it('does not authorize a PASSWORD_RECOVERY event without a session', () => {
    const state = new PasswordRecoveryState();

    state.handleAuthEvent('PASSWORD_RECOVERY', false);

    let verified = true;
    state.subscribe((value) => {
      verified = value;
    });
    assert.equal(verified, false);
  });

  it('clears recovery authorization when a different sign-in replaces it', () => {
    const state = new PasswordRecoveryState();
    state.handleAuthEvent('PASSWORD_RECOVERY', true);
    state.handleAuthEvent('SIGNED_IN', true);

    let verified = true;
    state.subscribe((value) => {
      verified = value;
    });
    assert.equal(verified, false);
  });

  it('clears recovery authorization after sign-out or successful update', () => {
    const state = new PasswordRecoveryState();
    state.handleAuthEvent('PASSWORD_RECOVERY', true);
    state.handleAuthEvent('SIGNED_OUT', false);

    let verified = true;
    state.subscribe((value) => {
      verified = value;
    });
    assert.equal(verified, false);

    state.handleAuthEvent('PASSWORD_RECOVERY', true);
    state.clear();
    assert.equal(verified, false);
  });
});
