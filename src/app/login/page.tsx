'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { authenticateWithEmailPassword } from '@/lib/auth/login';
import {
  validateLogin,
  mapLoginError,
  type LoginFailureKind,
} from '@/lib/validation/auth';
import Image from 'next/image';
import { AramLogo } from '@/components/brand/AramLogo';

const INPUT_BASE =
  'w-full px-4 py-3 bg-white border rounded-xl text-[14px] font-medium text-ds-ink placeholder-ds-muted/60 focus:outline-none transition-all shadow-xs';
const INPUT_OK = 'border-ds-line focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 focus:bg-white';
const INPUT_BAD = 'border-ds-danger focus:border-ds-danger focus:ring-2 focus:ring-ds-danger/20';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [failureKind, setFailureKind] = useState<LoginFailureKind | null>(null);
  const [loading, setLoading] = useState(false);
  const submitGuard = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  const clearFeedback = (field: 'email' | 'password') => {
    setError('');
    setFailureKind(null);
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || submitGuard.current) return;
    setError('');
    setFailureKind(null);

    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? 'email' : 'password')?.focus();
      return;
    }

    submitGuard.current = true;
    setLoading(true);

    try {
      const result = await authenticateWithEmailPassword(email, password, {
        signIn: (credentials) => supabase.auth.signInWithPassword(credentials),
        getUser: () => supabase.auth.getUser(),
      });

      if (result.kind === 'error') {
        setError(result.failure.message);
        setFailureKind(result.failure.kind);
        return;
      }

      router.push(result.redirectTo);
      if (result.kind === 'authenticated') router.refresh();
    } catch (caught) {
      const failure = mapLoginError(caught);
      setError(failure.message);
      setFailureKind(failure.kind);
    } finally {
      submitGuard.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-stage-night selection:bg-ds-accent/20 selection:text-ds-accent">
      {/* Conference hall behind a centred card */}
      <Image
        src="/login-background.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover object-[30%_center]"
      />
      {/* An even dim, a little deeper at the edges, so the stage lights show but never compete with the card */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-stage-night/45" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(18,10,38,0.65)_100%)]" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[440px] rounded-[28px] bg-white p-8 shadow-[0_40px_100px_-30px_rgba(10,6,30,0.75)] ring-1 ring-white/40 sm:p-10">
          <div className="mb-7 flex flex-col items-center text-center">
            <Link href="/" aria-label="Aram home" className="mb-6 inline-flex">
              <AramLogo size="lg" priority />
            </Link>
            <h1 className="font-display text-[28px] font-bold tracking-[0.01em] text-ds-ink">Welcome back</h1>
            <p className="mt-1.5 text-[14px] text-ds-muted">Sign in to manage your events.</p>
          </div>

        {/* Authentication Form */}
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4" noValidate>
          {error && (
            <div
              id="login-error"
              role="alert"
              aria-live="polite"
              className="bg-ds-danger/10 border border-ds-danger/30 text-ds-danger rounded-xl p-3 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150"
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email Address Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-ds-body">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFeedback('email');
              }}
              placeholder="name@company.com"
              className={`${INPUT_BASE} ${fieldErrors.email ? INPUT_BAD : INPUT_OK}`}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="text-[11px] font-semibold text-ds-danger">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[13px] font-medium text-ds-body">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-ds-accent hover:text-ds-accent-strong transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFeedback('password');
                }}
                placeholder="••••••••"
                className={`${INPUT_BASE} pl-3.5 pr-10 ${fieldErrors.password ? INPUT_BAD : INPUT_OK}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-ds-muted hover:text-ds-body focus:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="text-[11px] font-semibold text-ds-danger">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-12 mt-2 bg-stage-night text-white font-semibold text-[15px] rounded-xl transition-colors hover:bg-ds-accent active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span className="flex items-center gap-2">
                <span>Sign in</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            )}
          </button>
        </form>

        {failureKind === 'email_not_confirmed' && (
          <div className="w-full mt-3 text-center">
            <Link
              href="/organizer/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ds-accent hover:text-ds-accent-strong bg-ds-accent/10 hover:bg-ds-accent/15 py-2 px-3 rounded-lg transition-colors"
            >
              <span>Finish creating your account</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        )}

            <div className="mt-7 border-t border-ds-line pt-6 text-center text-[13.5px] text-ds-muted">
              Don&apos;t have an account?{' '}
              <Link
                href="/organizer/register"
                className="font-semibold text-ds-accent underline-offset-2 transition-colors hover:text-ds-accent-strong hover:underline"
              >
                Create organizer account
              </Link>
            </div>
          </div>

          <p className="mt-6 w-full max-w-[440px] text-center text-[12px] text-white/55">
            &copy; {new Date().getFullYear()} Aram Events. Events Beyond Boundaries.
          </p>
      </div>
    </div>
  );
}