'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { normalizeEmail, validateEmail } from '@/lib/validation/auth';
import { AramLogo } from '@/components/brand/AramLogo';

const INPUT_BASE =
  'w-full px-3.5 py-3 bg-ds-canvas border rounded-xl text-xs font-semibold text-ds-body placeholder-ds-muted/60 focus:outline-none focus:ring-1 transition-colors';
const INPUT_OK = 'border-ds-line focus:border-ds-accent focus:ring-ds-accent';
const INPUT_BAD = 'border-ds-danger focus:border-ds-danger focus:ring-ds-danger';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitGuard = useRef(false);
  const supabase = createClient();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || submitGuard.current) return;
    setError('');
    setSent(false);

    const validationError = validateEmail(email);
    setEmailError(validationError || '');
    if (validationError) {
      document.getElementById('recovery-email')?.focus();
      return;
    }

    submitGuard.current = true;
    setLoading(true);
    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        normalizeEmail(email),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (recoveryError) {
        setError('We could not send reset instructions right now. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      submitGuard.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ds-canvas flex flex-col justify-between items-center py-12 px-4">
      <div />
      <main className="w-full max-w-[420px] bg-white rounded-2xl p-8 sm:p-10 border border-ds-line shadow-xl shadow-black/5">
        <Link href="/" className="flex flex-col items-center gap-2 mb-6">
          <AramLogo size="lg" priority />
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-ds-body">Reset your password</h1>
          <p className="text-xs text-ds-muted mt-2">
            Enter your email and we&apos;ll send password reset instructions if an account exists.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-4 bg-ds-danger/10 border border-ds-danger/30 text-ds-danger rounded-xl p-3 text-xs font-semibold">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" aria-live="polite" className="mb-4 bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#166534] rounded-xl p-3 text-xs font-semibold">
            If an account exists for this email, password reset instructions have been sent.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
          <label htmlFor="recovery-email" className="text-xs font-semibold text-ds-body">
            Email address
          </label>
          <input
            id="recovery-email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'recovery-email-error' : undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError('');
              setError('');
              setSent(false);
            }}
            className={`${INPUT_BASE} ${emailError ? INPUT_BAD : INPUT_OK}`}
            placeholder="name@company.com"
            maxLength={255}
          />
          {emailError && (
            <p id="recovery-email-error" role="alert" className="text-[11px] font-semibold text-ds-danger">
              {emailError}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-12 mt-3 bg-ds-accent hover:bg-ds-accent-strong text-white font-bold text-sm rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset instructions'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ds-muted">
          Remembered your password?{' '}
          <Link href="/login" className="font-bold text-ds-accent hover:text-ds-accent-strong">
            Sign in
          </Link>
        </p>
      </main>
      <footer className="mt-8 text-center text-xs text-ds-muted">
        © 2026 Aram Events. Events Beyond Boundaries.
      </footer>
    </div>
  );
}
