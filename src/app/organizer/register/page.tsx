'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  PHONE_FORMAT_HINT,
  getConfirmPasswordState,
  getPhoneCountry,
  normalizeEmail,
  normalizeMobile,
  validateRegistration,
  type RegistrationField,
  type RegistrationFieldErrors,
} from '@/lib/validation/auth';
import Image from 'next/image';
import { AramLogo } from '@/components/brand/AramLogo';

const INPUT_BASE =
  'w-full h-10 px-3.5 bg-white border rounded-lg text-[13.5px] font-medium text-ds-ink placeholder-ds-muted/60 focus:outline-none transition-all shadow-xs';
const INPUT_OK = 'border-ds-line focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 focus:bg-white';
const INPUT_BAD = 'border-ds-danger focus:border-ds-danger focus:ring-2 focus:ring-ds-danger/20';

function inputClass(hasError: boolean, extra = '') {
  return `${INPUT_BASE} ${hasError ? INPUT_BAD : INPUT_OK} ${extra}`.trim();
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[11px] font-semibold text-ds-danger flex items-start gap-1">
      <span className="material-symbols-outlined text-sm shrink-0 leading-none mt-px">error</span>
      <span>{message}</span>
    </p>
  );
}

export default function OrganizerRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<RegistrationFieldErrors>({});

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Synchronous guard: state updates are async, so a fast double-click could otherwise
  // dispatch two requests before `loading` re-renders.
  const submitGuard = useRef(false);

  const clientErrors = validateRegistration({
    fullName,
    organizationName,
    email,
    phoneNumber,
    password,
    confirmPassword,
  }).fieldErrors;

  // Confirm password is validated live: a mismatch shows as soon as the confirm field has
  // content, and it re-evaluates whenever either field changes.
  const { mismatch: confirmMismatch, match: passwordsMatch } = getConfirmPasswordState(password, confirmPassword);

  const visibleError = (field: RegistrationField): string | undefined => {
    if (serverErrors[field]) return serverErrors[field];
    if (field === 'confirmPassword') {
      if (confirmMismatch) return PASSWORD_MISMATCH_MESSAGE;
      return touched.confirmPassword || submitted ? clientErrors.confirmPassword : undefined;
    }
    return touched[field] || submitted ? clientErrors[field] : undefined;
  };

  const touch = (field: RegistrationField) => setTouched((t) => ({ ...t, [field]: true }));

  const clearFieldFeedback = (field: RegistrationField) => {
    setError('');
    setServerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const errors = {
    fullName: visibleError('fullName'),
    organizationName: visibleError('organizationName'),
    email: visibleError('email'),
    phoneNumber: visibleError('phoneNumber'),
    password: visibleError('password'),
    confirmPassword: visibleError('confirmPassword'),
  };

  const describedBy = (field: RegistrationField, extra?: string) => {
    const ids = [errors[field] ? `${field}-error` : '', extra || ''].filter(Boolean).join(' ');
    return ids || undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || submitGuard.current) return; // Prevent double submit
    setError('');
    setSubmitted(true);

    const result = validateRegistration({
      fullName,
      organizationName,
      email,
      phoneNumber,
      phoneCountry,
      password,
      confirmPassword,
    });

    if (!result.valid || !result.values) {
      const order: RegistrationField[] = [
        'fullName',
        'organizationName',
        'email',
        'phoneNumber',
        'password',
        'confirmPassword',
      ];
      const first = order.find((f) => result.fieldErrors[f]);
      if (first) document.getElementById(first)?.focus();
      return;
    }

    submitGuard.current = true;
    setLoading(true);

    try {
      const response = await fetch('/api/organizer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: result.values.fullName,
          organizationName: result.values.organizationName,
          email: result.values.email,
          phoneNumber: result.values.phone,
          password, // sent exactly as typed (never trimmed)
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          setServerErrors(data.fieldErrors as RegistrationFieldErrors);
        }
        setError(
          data?.error || 'We could not create your account. Please check your details and try again.'
        );
        return;
      }

      // The account and organization now exist and the organizer is signed in.
      router.push(typeof data?.redirect === 'string' ? data.redirect : '/app');
    } catch {
      setError('Network error. Please verify your internet connection and try again.');
    } finally {
      submitGuard.current = false;
      setLoading(false);
    }
  };

  const phoneCheck = phoneNumber.trim() ? normalizeMobile(phoneNumber, phoneCountry) : null;
  const selectedCountry = getPhoneCountry(phoneCountry);

  return (
    <div className="relative min-h-dvh bg-stage-night selection:bg-ds-accent/20 selection:text-ds-accent">
      {/* Evening networking reception over the city skyline. Fixed, so it stays put if the form scrolls. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <Image
          src="/organizer-signup-background.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Same treatment as the sign-in page: an even dim, a little deeper at the edges */}
        <div className="absolute inset-0 bg-stage-night/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(18,10,38,0.65)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-6">
        {/* Centred registration card */}
        <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-[460px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(10,6,30,0.7)] ring-1 ring-white/40 flex flex-col">
        <Link href="/" aria-label="Aram home" className="mb-4 inline-flex self-center">
          <AramLogo size="lg" priority />
        </Link>

        {/* Heading & Subtitle */}
        <div className="mb-5 text-center">
          <h1 className="font-display text-[24px] font-bold leading-tight tracking-[0.01em] text-ds-ink">Create your organizer account</h1>
          <p className="text-[13px] text-ds-muted mt-1">
            Start managing your events with Aram Events.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3" noValidate>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-ds-danger/10 border border-ds-danger/30 text-ds-danger rounded-xl p-3 text-xs font-semibold flex items-start gap-2"
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
          {/* Full Name */}
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="fullName" className="text-[12.5px] font-medium text-ds-body">
              Full Name <span className="text-ds-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="fullName"
              name="name"
              type="text"
              autoComplete="name"
              required
              aria-required="true"
              aria-invalid={!!errors.fullName}
              aria-describedby={describedBy('fullName')}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearFieldFeedback('fullName');
              }}
              onBlur={() => touch('fullName')}
              placeholder="e.g. John Doe"
              maxLength={100}
              className={inputClass(!!errors.fullName)}
            />
            <FieldError id="fullName-error" message={errors.fullName} />
          </div>

          {/* Organization Name */}
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="organizationName" className="text-[12.5px] font-medium text-ds-body">
              Organization Name <span className="text-ds-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="organizationName"
              name="organization"
              type="text"
              autoComplete="organization"
              required
              aria-required="true"
              aria-invalid={!!errors.organizationName}
              aria-describedby={describedBy('organizationName')}
              value={organizationName}
              onChange={(e) => {
                setOrganizationName(e.target.value);
                clearFieldFeedback('organizationName');
              }}
              onBlur={() => touch('organizationName')}
              placeholder="e.g. Acme Events Foundation"
              maxLength={100}
              className={inputClass(!!errors.organizationName)}
            />
            <FieldError id="organizationName-error" message={errors.organizationName} />
          </div>
          </div>

          {/* Work Email */}
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="email" className="text-[12.5px] font-medium text-ds-body">
              Work Email <span className="text-ds-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={describedBy('email')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldFeedback('email');
              }}
              onBlur={() => {
                setEmail((v) => normalizeEmail(v));
                touch('email');
              }}
              placeholder="name@company.com"
              maxLength={255}
              className={inputClass(!!errors.email)}
            />
            <FieldError id="email-error" message={errors.email} />
          </div>

          {/* Mobile Number */}
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="phoneNumber" className="text-[12.5px] font-medium text-ds-body">
              Mobile Number <span className="text-ds-danger" aria-hidden="true">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative w-[108px] shrink-0">
                <select
                  id="phoneCountry"
                  aria-label="Country code"
                  autoComplete="tel-country-code"
                  value={phoneCountry}
                  onChange={(e) => {
                    setPhoneCountry(e.target.value);
                    clearFieldFeedback('phoneNumber');
                  }}
                  disabled={loading}
                  className={inputClass(false, 'appearance-none pl-3 pr-7 cursor-pointer')}
                >
                  {PHONE_COUNTRIES.map((c) => (
                    <option key={c.iso} value={c.iso}>
                      {`${c.iso} +${c.dial}`}{c.iso === phoneCountry ? '' : ` ${c.name}`}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-ds-muted"
                >
                  expand_more
                </span>
              </div>
              <input
                id="phoneNumber"
                name="tel-national"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                aria-required="true"
                aria-invalid={!!errors.phoneNumber}
                aria-describedby={describedBy('phoneNumber', 'phoneNumber-hint')}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  clearFieldFeedback('phoneNumber');
                }}
                onBlur={() => touch('phoneNumber')}
                placeholder={selectedCountry.example}
                maxLength={25}
                className={inputClass(!!errors.phoneNumber, 'min-w-0 flex-1')}
              />
            </div>
            <FieldError id="phoneNumber-error" message={errors.phoneNumber} />
            {!errors.phoneNumber && (
              <p id="phoneNumber-hint" className="text-[11px] text-ds-muted flex items-center gap-1">
                {phoneCheck?.valid ? (
                  <>
                    <span className="material-symbols-outlined text-sm text-[#16A34A] leading-none">check_circle</span>
                    <span>We&apos;ll save this as {phoneCheck.e164}</span>
                  </>
                ) : (
                  <span>{selectedCountry.name} mobile number. Pick a different country code if needed.</span>
                )}
              </p>
            )}
            {errors.phoneNumber && (
              <span id="phoneNumber-hint" className="sr-only">
                {PHONE_FORMAT_HINT}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
          {/* Password */}
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="password" className="text-[12.5px] font-medium text-ds-body">
              Password <span className="text-ds-danger" aria-hidden="true">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={describedBy('password', 'password-requirements')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldFeedback('password');
                }}
                onBlur={() => touch('password')}
                placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                maxLength={PASSWORD_MAX_LENGTH}
                className={inputClass(!!errors.password, 'pl-3.5 pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 text-ds-muted hover:text-ds-ink focus:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <FieldError id="password-error" message={errors.password} />
            <p
              id="password-requirements"
              className={`text-[11px] flex items-center gap-1 ${
                password.length >= PASSWORD_MIN_LENGTH && password.trim().length > 0
                  ? 'text-[#16A34A]'
                  : 'text-ds-muted'
              }`}
            >
              <span className="material-symbols-outlined text-sm leading-none">
                {password.length >= PASSWORD_MIN_LENGTH && password.trim().length > 0
                  ? 'check_circle'
                  : 'radio_button_unchecked'}
              </span>
              <span>At least {PASSWORD_MIN_LENGTH} characters</span>
            </p>
          </div>

          {/* Confirm Password */}
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="confirmPassword" className="text-[12.5px] font-medium text-ds-body">
              Confirm Password <span className="text-ds-danger" aria-hidden="true">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="confirmPassword"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword
                    ? 'confirmPassword-error'
                    : passwordsMatch
                      ? 'confirmPassword-match'
                      : undefined
                }
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldFeedback('confirmPassword');
                }}
                onBlur={() => touch('confirmPassword')}
                placeholder="Re-enter your password"
                maxLength={PASSWORD_MAX_LENGTH}
                className={inputClass(!!errors.confirmPassword, 'pl-3.5 pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                className="absolute right-2.5 text-ds-muted hover:text-ds-ink focus:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {/* Directly below the confirm input; updates on every keystroke in either field */}
            <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
            {!errors.confirmPassword && passwordsMatch && (
              <p
                id="confirmPassword-match"
                role="status"
                className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
                <span>Passwords match</span>
              </p>
            )}
          </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || confirmMismatch}
            aria-busy={loading}
            className="w-full h-11 mt-2 bg-ds-accent text-white font-semibold text-[14px] rounded-lg transition-colors hover:bg-ds-accent-strong active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span className="flex items-center gap-2">
                <span>Create Organizer Account</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            )}
          </button>
        </form>

        {/* Existing account link */}
        <div className="mt-5 w-full border-t border-ds-line pt-4 text-center text-[13px] text-ds-muted">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-ds-accent hover:text-ds-accent-strong transition-colors underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-white/55">
        &copy; {new Date().getFullYear()} Aram Events. Events Beyond Boundaries.
      </p>
        </div>
      </div>
    </div>
  );
}
