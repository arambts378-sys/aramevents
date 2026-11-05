import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emailRateLimitMessage, isEmailRateLimit } from '../emailRateLimit';

const NOW = Date.parse('2026-11-03T15:00:00Z');

describe('email rate limit messages', () => {
  it('recognises both Supabase email limits and nothing else', () => {
    assert.equal(isEmailRateLimit({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }), true);
    assert.equal(isEmailRateLimit({ message: 'For security purposes, you can only request this after 42 seconds.' }), true);
    assert.equal(isEmailRateLimit({ message: 'User not found' }), false);
    assert.equal(isEmailRateLimit(null), false);
  });

  it('uses the wait Supabase gives for a single address', () => {
    const message = emailRateLimitMessage({ message: 'For security purposes, you can only request this after 42 seconds.' }, [], NOW);
    assert.match(message, /Try again in 42 seconds/);
  });

  it('retries the hourly limit an hour after the most recent email', () => {
    const message = emailRateLimitMessage(
      { message: 'email rate limit exceeded' },
      ['2026-11-03T14:19:54Z', '2026-11-03T14:05:00Z', null],
      NOW,
    );
    assert.match(message, /Try again in about 20 minutes/);
  });

  it('falls back to a few minutes when no recent email is known', () => {
    const message = emailRateLimitMessage({ message: 'email rate limit exceeded' }, ['2026-11-03T12:00:00Z'], NOW);
    assert.match(message, /Try again in a few minutes/);
  });
});
