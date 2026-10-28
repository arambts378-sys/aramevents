/**
 * Unit tests for shared auth validation (registration, mobile number, password, login errors).
 * Uses built-in node:test (no dependencies). Run: npm run test:auth
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { authenticateWithEmailPassword } from '@/lib/auth/login';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  getConfirmPasswordState,
  mapLoginError,
  normalizeEmail,
  normalizeIndianMobile,
  normalizeMobile,
  validateConfirmPassword,
  validateLogin,
  validatePassword,
  validateRegistration,
} from '../auth';

const VALID = {
  fullName: '  Asha Rao  ',
  organizationName: ' Acme Events ',
  email: '  Asha.Rao@Example.COM ',
  phoneNumber: '+91 98765 43210',
  password: 'ExamplePass123',
  confirmPassword: 'ExamplePass123',
};

describe('registration: valid input', () => {
  test('1. valid registration with a mobile number normalizes every field', () => {
    const r = validateRegistration(VALID);
    assert.equal(r.valid, true);
    assert.deepEqual(r.values, {
      fullName: 'Asha Rao',
      organizationName: 'Acme Events',
      email: 'asha.rao@example.com',
      phone: '+919876543210',
      password: 'ExamplePass123',
    });
  });
});

describe('registration: mobile number', () => {
  test('2. missing mobile number is rejected', () => {
    for (const phoneNumber of [undefined, null, '', '   ']) {
      const r = validateRegistration({ ...VALID, phoneNumber });
      assert.equal(r.valid, false);
      assert.equal(r.fieldErrors.phoneNumber, 'Mobile number is required.');
    }
  });

  test('3. invalid mobile numbers are rejected', () => {
    const bad = [
      '98765abcde', // letters
      'abcdefghij',
      '12345', // too short
      '98765432101', // 11 digits, no valid prefix
      '5876543210', // does not start with 6-9
      '+1 415 555 2671', // non-Indian country code
      '+91 98765 4321', // 9 digits after +91
      '9876 5432 10 x',
      '98765+43210', // misplaced plus
      '(98765) 43210', // unsupported punctuation
      '9'.repeat(30),
    ];
    for (const phoneNumber of bad) {
      assert.equal(normalizeIndianMobile(phoneNumber).valid, false, `should reject ${phoneNumber}`);
    }
  });

  test('accepted formats all normalize to +91XXXXXXXXXX', () => {
    for (const p of ['9876543210', '09876543210', '919876543210', '+919876543210', '+91 98765-43210', ' 98765 43210 ']) {
      const r = normalizeIndianMobile(p);
      assert.equal(r.valid, true, p);
      assert.equal(r.e164, '+919876543210');
    }
  });
});

describe('registration: password policy', () => {
  test('4. missing / empty / whitespace-only password is rejected', () => {
    assert.equal(validatePassword(undefined), 'Password is required.');
    assert.equal(validatePassword(''), 'Password is required.');
    assert.equal(validatePassword('          '), 'Password cannot be only spaces.');
  });

  test('5. password below the minimum length is rejected', () => {
    assert.equal(PASSWORD_MIN_LENGTH, 8);
    assert.match(validatePassword('1234567') as string, /at least 8 characters/);
    assert.equal(validatePassword('12345678'), null);
  });

  test('password is never trimmed or modified', () => {
    const r = validateRegistration({ ...VALID, password: '  spaced pass  ', confirmPassword: '  spaced pass  ' });
    assert.equal(r.valid, true);
    assert.equal(r.values?.password, '  spaced pass  ');
  });

  test('password above maximum length is rejected', () => {
    assert.match(validatePassword('a'.repeat(129)) as string, /cannot exceed 128/);
  });
});

describe('registration: confirm password', () => {
  test('6. matching passwords: no error, match indicator shown', () => {
    assert.equal(validateConfirmPassword('ExamplePass123', 'ExamplePass123'), null);
    assert.deepEqual(getConfirmPasswordState('ExamplePass123', 'ExamplePass123'), { mismatch: false, match: true });
  });

  test('7. mismatch while typing shows "Passwords do not match" immediately', () => {
    // Prefix typing: every partial entry that differs is a mismatch from the first keystroke.
    const password = 'ExamplePass123';
    for (let i = 1; i < password.length; i++) {
      const partial = password.slice(0, i);
      assert.deepEqual(getConfirmPasswordState(password, partial), { mismatch: true, match: false });
    }
    assert.equal(validateConfirmPassword('ExamplePass123', 'ExamplePass12'), PASSWORD_MISMATCH_MESSAGE);
    assert.equal(PASSWORD_MISMATCH_MESSAGE, 'Passwords do not match');
  });

  test('8. changing the original password after confirmation re-evaluates', () => {
    assert.equal(getConfirmPasswordState('ExamplePass123', 'ExamplePass123').match, true);
    const after = getConfirmPasswordState('ExamplePass1234', 'ExamplePass123');
    assert.deepEqual(after, { mismatch: true, match: false });
    // and back again clears the mismatch
    assert.deepEqual(getConfirmPasswordState('ExamplePass123', 'ExamplePass123'), { mismatch: false, match: true });
  });

  test('empty confirm is neither mismatch nor match; case and whitespace are significant', () => {
    assert.deepEqual(getConfirmPasswordState('abc12345', ''), { mismatch: false, match: false });
    assert.deepEqual(getConfirmPasswordState('', ''), { mismatch: false, match: false });
    assert.equal(getConfirmPasswordState('Abc12345', 'abc12345').mismatch, true);
    assert.equal(getConfirmPasswordState('abc12345', 'abc12345 ').mismatch, true);
  });

  test('server-side registration rejects a mismatch', () => {
    const r = validateRegistration({ ...VALID, confirmPassword: 'ExamplePass12' });
    assert.equal(r.valid, false);
    assert.equal(r.fieldErrors.confirmPassword, 'Passwords do not match');
  });
});

describe('email normalization', () => {
  test('is trimmed and lowercased consistently', () => {
    assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
    assert.equal(validateRegistration({ ...VALID, email: 'not-an-email' }).fieldErrors.email, 'Enter a valid email address.');
  });
});

describe('login validation and error mapping', () => {
  test('13. missing fields produce required-field messages', () => {
    assert.deepEqual(validateLogin('', ''), { email: 'Email is required.', password: 'Password is required.' });
    assert.deepEqual(validateLogin('   ', 'x'), { email: 'Email is required.' });
    assert.deepEqual(validateLogin('a@b.co', ''), { password: 'Password is required.' });
    assert.deepEqual(validateLogin('not-an-email', 'x'), { email: 'Enter a valid email address.' });
    assert.deepEqual(validateLogin('a@b.co', 'x'), {});
  });

  test('12. wrong credentials map to one generic, non-enumerating message', () => {
    const r = mapLoginError({ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' });
    assert.equal(r.kind, 'invalid_credentials');
    assert.equal(r.message, 'Invalid email or password.');
  });

  test('14. unverified email is reported with the verification path', () => {
    const r = mapLoginError({ code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' });
    assert.equal(r.kind, 'email_not_confirmed');
    assert.match(r.message, /not been verified/);
  });

  test('15. network / server / rate-limit failures are recoverable and leak nothing internal', () => {
    assert.equal(mapLoginError({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }).kind, 'network');
    assert.equal(mapLoginError(new TypeError('fetch failed')).kind, 'network');
    assert.equal(mapLoginError({ status: 429, code: 'over_request_rate_limit' }).kind, 'rate_limited');

    const internal = mapLoginError({
      status: 500,
      code: 'unexpected_failure',
      message: 'relation "auth.users" does not exist at db-host-1.internal',
    });
    assert.equal(internal.kind, 'unknown');
    assert.doesNotMatch(internal.message, /relation|auth\.users|db-host/);
    assert.equal(mapLoginError(null).kind, 'unknown');
  });

  test('16-17. confirmed existing user signs in with the unchanged password and redirects to the app', async () => {
    let credentials: { email: string; password: string } | undefined;
    const result = await authenticateWithEmailPassword(' Existing@Example.com ', '  Original Pass  ', {
      signIn: async (value) => {
        credentials = value;
        return { error: null };
      },
      getUser: async () => ({
        data: { user: { email_confirmed_at: '2026-01-01T00:00:00Z' } },
        error: null,
      }),
    });

    assert.deepEqual(credentials, {
      email: 'existing@example.com',
      password: '  Original Pass  ',
    });
    assert.deepEqual(result, { kind: 'authenticated', redirectTo: '/app' });
  });

  test('unverified successful authentication redirects to the existing OTP flow', async () => {
    const result = await authenticateWithEmailPassword('pending@example.com', 'ExistingPass123', {
      signIn: async () => ({ error: null }),
      getUser: async () => ({ data: { user: { email_confirmed_at: null } }, error: null }),
    });

    assert.deepEqual(result, {
      kind: 'unverified',
      redirectTo: '/organizer/verify?email=pending%40example.com&sent=0',
    });
  });

  test('failed credentials do not query the authenticated user', async () => {
    let getUserCalled = false;
    const result = await authenticateWithEmailPassword('unknown@example.com', 'WrongPass123', {
      signIn: async () => ({
        error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
      }),
      getUser: async () => {
        getUserCalled = true;
        return { data: { user: null }, error: null };
      },
    });

    assert.equal(getUserCalled, false);
    assert.deepEqual(result, {
      kind: 'error',
      failure: { kind: 'invalid_credentials', message: 'Invalid email or password.' },
    });
  });
});

describe('registration: international mobile numbers', () => {
  test('a +code number is read in its own country, whatever is selected', () => {
    assert.equal(normalizeMobile('+971 50 123 4567').e164, '+971501234567');
    assert.equal(normalizeMobile('+44 7400 123456', 'IN').e164, '+447400123456');
    assert.equal(normalizeMobile('+1 415 555 2671').e164, '+14155552671');
  });

  test('a national number uses the selected country, with trunk 0 or repeated code tolerated', () => {
    assert.equal(normalizeMobile('50 123 4567', 'AE').e164, '+971501234567');
    assert.equal(normalizeMobile('07400 123456', 'GB').e164, '+447400123456');
    assert.equal(normalizeMobile('971501234567', 'AE').e164, '+971501234567');
    assert.equal(normalizeMobile('98765 43210').e164, '+919876543210');
  });

  test('wrong length, wrong mobile range or unsupported code is rejected', () => {
    assert.equal(normalizeMobile('50 123 456', 'AE').valid, false);
    assert.equal(normalizeMobile('20 7946 0958', 'GB').valid, false);
    assert.match(normalizeMobile('+999 1234 5678').error as string, /not supported/);
    assert.match(normalizeMobile('12345', 'SG').error as string, /Singapore/);
  });

  test('validateRegistration honours the selected country', () => {
    const r = validateRegistration({ ...VALID, phoneNumber: '8123 4567', phoneCountry: 'SG' });
    assert.equal(r.valid, true);
    assert.equal(r.values?.phone, '+6581234567');
  });
});
