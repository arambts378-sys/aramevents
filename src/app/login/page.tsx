'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { authenticateWithEmailPassword } from '@/lib/auth/login';
import {
  normalizeEmail,
  validateLogin,
  mapLoginError,
  type LoginFailureKind,
} from '@/lib/validation/auth';

const INPUT_BASE =
  'w-full px-3.5 py-3 bg-[#F7F5FF] border rounded-xl text-xs font-semibold text-[#27243A] placeholder-[#77738A]/60 focus:outline-none focus:ring-1 transition-colors';
const INPUT_OK = 'border-[#E5E1F5] focus:border-[#7C5CFC] focus:ring-[#7C5CFC]';
const INPUT_BAD = 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]';

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
    // Editing a field clears stale server errors and that field's validation message.
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

      // Defense in depth: unverified sessions are also redirected by middleware.
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
    <div className="min-h-screen bg-[#F7F5FF] flex flex-col justify-between items-center py-12 px-4 selection:bg-[#7C5CFC]/20 selection:text-[#7C5CFC]">
      {/* Top Spacer for Vertical Balance */}
      <div />

      {/* Main Centered Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 sm:p-10 border border-[#E5E1F5] shadow-xl shadow-[#7C5CFC]/5 flex flex-col items-center">
        {/* Brand Logo & Header */}
        <Link href="/" className="flex flex-col items-center gap-2 group mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#7C5CFC] flex items-center justify-center text-white shadow-md shadow-[#7C5CFC]/25 group-hover:scale-105 transition-transform duration-200">
            <span className="material-symbols-outlined text-2xl">layers</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-xl font-bold tracking-tight text-[#27243A]">ARAM BTS</span>
            <span className="text-xs text-[#77738A] tracking-wider font-medium">Events Beyond Boundaries</span>
          </div>
        </Link>

        {/* Welcome Heading */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#27243A]">Welcome back</h1>
          <p className="text-xs text-[#77738A] mt-1 font-normal">Sign in to manage your events.</p>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4" noValidate>
          {error && (
            <div
              id="login-error"
              role="alert"
              aria-live="polite"
              className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-xl p-3 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150"
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email Address Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-[#27243A]">
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
              <p id="email-error" role="alert" className="text-[11px] font-semibold text-[#DC2626]">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold text-[#27243A]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#7C5CFC] hover:text-[#5B3FE8] transition-colors"
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
                className="absolute right-3 text-[#77738A] hover:text-[#27243A] focus:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="text-[11px] font-semibold text-[#DC2626]">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-12 mt-2 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#7C5CFC]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {failureKind === 'email_not_confirmed' && (
          <div className="w-full mt-3 text-center">
            <Link
              href={`/organizer/verify?email=${encodeURIComponent(normalizeEmail(email))}&sent=0`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C5CFC] hover:text-[#5B3FE8] bg-[#7C5CFC]/10 hover:bg-[#7C5CFC]/15 py-2 px-3 rounded-lg transition-colors"
            >
              <span>Verify email now</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        )}

        {/* Organizer Account Registration Link */}
        <div className="mt-6 text-center text-xs text-[#77738A]">
          Don&apos;t have an account?{' '}
          <Link
            href="/organizer/register"
            className="font-bold text-[#7C5CFC] hover:text-[#5B3FE8] transition-colors underline-offset-2 hover:underline"
          >
            Create organizer account
          </Link>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="mt-8 text-center text-xs text-[#77738A]">
        © 2026 ARAM BTS. Events Beyond Boundaries.
      </footer>
    </div>
  );
}