/**
 * Shared authentication validation.
 *
 * Pure functions with no dependencies so the exact same rules run in the browser
 * (for immediate feedback) and in the API routes (for enforcement).
 * Client-side validation is a usability aid only; the server always re-validates.
 */

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------
// The repo has no supabase/config.toml, so the hosted Supabase Auth policy cannot be
// inspected from source. Supabase's default minimum is 6 characters; the application
// already enforced 8 on organizer registration, which is stricter than (and therefore
// compatible with) that default. Supabase still enforces its own policy server-side
// (e.g. `weak_password`), and the API maps that to a safe message.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIREMENTS_TEXT = `At least ${PASSWORD_MIN_LENGTH} characters`;

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const EMAIL_MAX_LENGTH = 255;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string' || !email.trim()) return 'Email address is required.';
  const norm = normalizeEmail(email);
  if (norm.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(norm)) {
    return 'Enter a valid email address.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------
export function validateFullName(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim()) return 'Full name is required.';
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
  if (trimmed.length > 100) return 'Full name must not exceed 100 characters.';
  return null;
}

export function validateOrganizationName(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim()) return 'Organization name is required.';
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Organization name must be at least 2 characters.';
  if (trimmed.length > 100) return 'Organization name must not exceed 100 characters.';
  return null;
}

// ---------------------------------------------------------------------------
// Mobile number
// ---------------------------------------------------------------------------
export const PHONE_FORMAT_HINT = 'Enter a valid mobile number for the selected country, e.g. 98765 43210 for India.';

export interface PhoneResult {
  valid: boolean;
  /** Canonical E.164 value (+<country code><number>). Only set when valid. */
  e164?: string;
  error?: string;
}

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2, used as the select value */
  iso: string;
  name: string;
  dial: string;
  /** Allowed national number lengths (digits after the country code, no trunk 0) */
  lengths: [number, number];
  /** Optional rule for the national number, e.g. the mobile range's first digit */
  pattern?: RegExp;
  example: string;
}

/**
 * Countries offered in the sign-up form. Rules are format checks for mobile
 * numbers, not a full numbering plan. India comes first and is the default.
 */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { iso: 'IN', name: 'India', dial: '91', lengths: [10, 10], pattern: /^[6-9]/, example: '98765 43210' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', lengths: [9, 9], pattern: /^5/, example: '50 123 4567' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', lengths: [9, 9], pattern: /^5/, example: '51 234 5678' },
  { iso: 'QA', name: 'Qatar', dial: '974', lengths: [8, 8], pattern: /^[3567]/, example: '3312 3456' },
  { iso: 'KW', name: 'Kuwait', dial: '965', lengths: [8, 8], pattern: /^[569]/, example: '5012 3456' },
  { iso: 'OM', name: 'Oman', dial: '968', lengths: [8, 8], pattern: /^[79]/, example: '9212 3456' },
  { iso: 'BH', name: 'Bahrain', dial: '973', lengths: [8, 8], pattern: /^3/, example: '3600 1234' },
  { iso: 'US', name: 'United States / Canada', dial: '1', lengths: [10, 10], pattern: /^[2-9]/, example: '415 555 2671' },
  { iso: 'GB', name: 'United Kingdom', dial: '44', lengths: [10, 10], pattern: /^7/, example: '7400 123456' },
  { iso: 'SG', name: 'Singapore', dial: '65', lengths: [8, 8], pattern: /^[89]/, example: '8123 4567' },
  { iso: 'MY', name: 'Malaysia', dial: '60', lengths: [9, 10], pattern: /^1/, example: '12 345 6789' },
  { iso: 'LK', name: 'Sri Lanka', dial: '94', lengths: [9, 9], pattern: /^7/, example: '71 234 5678' },
  { iso: 'NP', name: 'Nepal', dial: '977', lengths: [10, 10], pattern: /^9/, example: '984 1234567' },
  { iso: 'BD', name: 'Bangladesh', dial: '880', lengths: [10, 10], pattern: /^1/, example: '1812 345678' },
  { iso: 'AU', name: 'Australia', dial: '61', lengths: [9, 9], pattern: /^4/, example: '412 345 678' },
  { iso: 'NZ', name: 'New Zealand', dial: '64', lengths: [8, 10], pattern: /^2/, example: '21 123 4567' },
  { iso: 'DE', name: 'Germany', dial: '49', lengths: [10, 11], pattern: /^1/, example: '1512 3456789' },
  { iso: 'FR', name: 'France', dial: '33', lengths: [9, 9], pattern: /^[67]/, example: '6 12 34 56 78' },
  { iso: 'ZA', name: 'South Africa', dial: '27', lengths: [9, 9], pattern: /^[678]/, example: '71 123 4567' },
  { iso: 'KE', name: 'Kenya', dial: '254', lengths: [9, 9], pattern: /^[17]/, example: '712 345678' },
  { iso: 'NG', name: 'Nigeria', dial: '234', lengths: [10, 10], pattern: /^[789]/, example: '802 123 4567' },
];

export const DEFAULT_PHONE_COUNTRY = 'IN';

export function getPhoneCountry(iso: string | undefined | null): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) || PHONE_COUNTRIES[0];
}

/** Longest matching dial code wins, so +971 is not read as +97x. */
function countryFromE164Digits(digits: string) {
  return [...PHONE_COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => digits.startsWith(c.dial));
}

/**
 * Validates and normalizes a mobile number to E.164.
 *
 * - With a leading "+", the country is read from the number itself (any listed country).
 * - Without one, the number is read as a national number of `countryIso` (default India);
 *   a leading trunk "0" and a repeated country code are tolerated.
 * Spaces and hyphens are allowed only as separators. Letters and other characters are rejected.
 *
 * NOTE: this validates format only. The number is NOT verified (no SMS/OTP flow exists).
 */
export function normalizeMobile(input: unknown, countryIso: string = DEFAULT_PHONE_COUNTRY): PhoneResult {
  if (typeof input !== 'string' || !input.trim()) {
    return { valid: false, error: 'Mobile number is required.' };
  }

  const raw = input.trim();
  if (raw.length > 25) {
    return { valid: false, error: PHONE_FORMAT_HINT };
  }

  // Only digits, one optional leading "+", spaces and hyphens are permitted.
  if (!/^\+?[0-9][0-9 \-]*$/.test(raw) || raw.indexOf('+') > 0) {
    return { valid: false, error: PHONE_FORMAT_HINT };
  }

  let digits = raw.replace(/[^0-9]/g, '');
  let country: PhoneCountry | undefined;

  if (raw.startsWith('+')) {
    country = countryFromE164Digits(digits);
    if (!country) {
      return { valid: false, error: 'This country code is not supported yet. Choose a country from the list.' };
    }
    digits = digits.slice(country.dial.length);
  } else {
    country = getPhoneCountry(countryIso);
    const [, max] = country.lengths;
    if (digits.length > max && digits.startsWith(country.dial) && digits.length - country.dial.length <= max) {
      digits = digits.slice(country.dial.length);
    } else if (digits.length === max + 1 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
  }

  const [min, max] = country.lengths;
  if (digits.length < min || digits.length > max || (country.pattern && !country.pattern.test(digits))) {
    return { valid: false, error: `Enter a valid ${country.name} mobile number, e.g. ${country.example}.` };
  }

  return { valid: true, e164: `+${country.dial}${digits}` };
}

/** Indian-only variant kept for existing callers; same rules as normalizeMobile with India. */
export function normalizeIndianMobile(input: unknown): PhoneResult {
  if (typeof input === 'string' && input.trim().startsWith('+') && !input.replace(/[^0-9+]/g, '').startsWith('+91')) {
    return { valid: false, error: 'Only Indian mobile numbers (+91) are supported.' };
  }
  return normalizeMobile(input, 'IN');
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------
/** Never trims or otherwise modifies the password. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Password is required.';
  if (password.trim().length === 0) return 'Password cannot be only spaces.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}

export const PASSWORD_MISMATCH_MESSAGE = 'Passwords do not match';

/** Exact (untrimmed, case-sensitive) comparison. Empty confirm is "required", not "mismatch". */
export function validateConfirmPassword(password: unknown, confirm: unknown): string | null {
  if (typeof confirm !== 'string' || confirm.length === 0) return 'Please confirm your password.';
  if (password !== confirm) return PASSWORD_MISMATCH_MESSAGE;
  return null;
}

/**
 * Live confirm-password state, recomputed on every keystroke in either field.
 * - mismatch: confirm has content and differs from password (shows "Passwords do not match")
 * - match: both non-empty and identical (shows the matching indicator)
 * An empty confirm field is neither: it is only reported as "required" on blur/submit.
 */
export function getConfirmPasswordState(
  password: string,
  confirm: string
): { mismatch: boolean; match: boolean } {
  const mismatch = confirm.length > 0 && confirm !== password;
  const match = password.length > 0 && confirm.length > 0 && confirm === password;
  return { mismatch, match };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export interface RegistrationInput {
  fullName: unknown;
  organizationName: unknown;
  email: unknown;
  phoneNumber: unknown;
  /** Country for a number typed without +code (ISO code, default India). */
  phoneCountry?: string;
  password: unknown;
  confirmPassword: unknown;
}

export type RegistrationField =
  | 'fullName'
  | 'organizationName'
  | 'email'
  | 'phoneNumber'
  | 'password'
  | 'confirmPassword';

export type RegistrationFieldErrors = Partial<Record<RegistrationField, string>>;

export interface RegistrationValidation {
  valid: boolean;
  fieldErrors: RegistrationFieldErrors;
  /** Normalized, safe-to-persist values. Only meaningful when valid. */
  values?: {
    fullName: string;
    organizationName: string;
    email: string;
    phone: string;
    password: string;
  };
}

export function validateRegistration(input: RegistrationInput): RegistrationValidation {
  const fieldErrors: RegistrationFieldErrors = {};

  const nameError = validateFullName(input.fullName);
  if (nameError) fieldErrors.fullName = nameError;

  const orgError = validateOrganizationName(input.organizationName);
  if (orgError) fieldErrors.organizationName = orgError;

  const emailError = validateEmail(input.email);
  if (emailError) fieldErrors.email = emailError;

  const phone = normalizeMobile(input.phoneNumber, input.phoneCountry);
  if (!phone.valid) fieldErrors.phoneNumber = phone.error;

  const passwordError = validatePassword(input.password);
  if (passwordError) fieldErrors.password = passwordError;

  const confirmError = validateConfirmPassword(input.password, input.confirmPassword);
  if (confirmError) fieldErrors.confirmPassword = confirmError;

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    fieldErrors,
    values: {
      fullName: (input.fullName as string).trim(),
      organizationName: (input.organizationName as string).trim(),
      email: normalizeEmail(input.email as string),
      phone: phone.e164 as string,
      password: input.password as string,
    },
  };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export interface LoginFieldErrors {
  email?: string;
  password?: string;
}

export function validateLogin(email: unknown, password: unknown): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email is required.';
  } else {
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
  }
  if (typeof password !== 'string' || password.length === 0) {
    errors.password = 'Password is required.';
  }
  return errors;
}

export type LoginFailureKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'network'
  | 'unknown';

export interface LoginFailure {
  kind: LoginFailureKind;
  message: string;
}

export const LOGIN_MESSAGES = {
  invalid: 'Invalid email or password.',
  unverified:
    'This account was never finished. Create your organizer account again with the same email to complete it.',
  rateLimited: 'Too many sign-in attempts. Please wait a moment and try again.',
  network: 'We could not reach the server. Check your connection and try again.',
  unknown: 'Something went wrong while signing in. Please try again.',
} as const;

export interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

/**
 * Maps a Supabase Auth error to a safe, user-facing message.
 *
 * Supabase returns one generic `invalid_credentials` for both "no such user" and
 * "wrong password", so a specific "Password is incorrect" / "Username is incorrect"
 * message cannot be produced reliably and would create an account-enumeration oracle.
 * `email_not_confirmed` is only returned after the password was verified, so it is
 * safe to surface. Raw `error.message` is never shown.
 */
export function mapLoginError(error: unknown): LoginFailure {
  if (!error || typeof error !== 'object') {
    return { kind: 'unknown', message: LOGIN_MESSAGES.unknown };
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code.toLowerCase() : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  const name = 'name' in error && typeof error.name === 'string' ? error.name : '';

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return { kind: 'email_not_confirmed', message: LOGIN_MESSAGES.unverified };
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return { kind: 'invalid_credentials', message: LOGIN_MESSAGES.invalid };
  }
  if (status === 429 || code.includes('rate_limit')) {
    return { kind: 'rate_limited', message: LOGIN_MESSAGES.rateLimited };
  }
  if (
    status === 0 ||
    name === 'AuthRetryableFetchError' ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('network')
  ) {
    return { kind: 'network', message: LOGIN_MESSAGES.network };
  }
  return { kind: 'unknown', message: LOGIN_MESSAGES.unknown };
}
