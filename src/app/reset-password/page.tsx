'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { passwordRecoveryState } from '@/lib/auth/passwordRecoveryState';
import {
  getConfirmPasswordState,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  validateConfirmPassword,
  validatePassword,
} from '@/lib/validation/auth';
import { AramLogo } from '@/components/brand/AramLogo';

const INPUT_BASE =
  'w-full px-3.5 py-3 bg-ds-canvas border rounded-xl text-xs font-semibold text-ds-body placeholder-ds-muted/60 focus:outline-none focus:ring-1 transition-colors';
const INPUT_OK = 'border-ds-line focus:border-ds-accent focus:ring-ds-accent';
const INPUT_BAD = 'border-ds-danger focus:border-ds-danger focus:ring-ds-danger';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(false);
  const submitGuard = useRef(false);

  useEffect(() => {
    let mounted = true;
    const unsubscribeRecoveryState = passwordRecoveryState.subscribe((verified) => {
      if (mounted) setHasRecoverySession(verified);
    });

    supabase.auth.getSession().then(({ error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError('We could not validate this reset link. Request a new one and try again.');
      setSessionChecked(true);
    }).catch(() => {
      if (!mounted) return;
      setError('We could not validate this reset link. Request a new one and try again.');
      setSessionChecked(true);
    });

    return () => {
      mounted = false;
      unsubscribeRecoveryState();
    };
  }, [supabase]);

  const { mismatch, match } = getConfirmPasswordState(password, confirmPassword);
  const passwordError = submitted ? validatePassword(password) : null;
  const confirmationError = mismatch
    ? PASSWORD_MISMATCH_MESSAGE
    : submitted
      ? validateConfirmPassword(password, confirmPassword)
      : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || submitGuard.current || !hasRecoverySession) return;
    setSubmitted(true);
    setError('');
    const newPasswordError = validatePassword(password);
    const newConfirmationError = validateConfirmPassword(password, confirmPassword);
    if (newPasswordError || newConfirmationError) {
      document.getElementById(newPasswordError ? 'new-password' : 'confirm-password')?.focus();
      return;
    }

    submitGuard.current = true;
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          updateError.code === 'weak_password'
            ? 'Choose a password that meets the security requirements and try again.'
            : 'We could not update your password. The reset link may have expired; request a new one and try again.'
        );
        return;
      }
      setUpdated(true);
      passwordRecoveryState.clear();
      router.push('/app');
      router.refresh();
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
          <h1 className="text-2xl font-bold text-ds-body">Choose a new password</h1>
          <p className="text-xs text-ds-muted mt-2">
            Use at least {PASSWORD_MIN_LENGTH} characters. Your password is case-sensitive.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-4 bg-ds-danger/10 border border-ds-danger/30 text-ds-danger rounded-xl p-3 text-xs font-semibold">
            {error}
          </p>
        )}
        {updated && (
          <p role="status" className="mb-4 bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#166534] rounded-xl p-3 text-xs font-semibold">
            Your password was updated. Redirecting to your account...
          </p>
        )}

        {!sessionChecked ? (
          <div role="status" className="flex justify-center py-4">
            <span className="w-5 h-5 border-2 border-ds-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasRecoverySession ? (
          <div className="text-center">
            <p className="text-xs text-ds-muted">
              This reset link is invalid or expired. Request a new password reset email.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block mt-5 text-xs font-bold text-ds-accent hover:text-ds-accent-strong"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-xs font-semibold text-ds-body">
                New password
              </label>
              <div className="relative">
                <input suppressHydrationWarning
                  id="new-password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'new-password-error' : 'password-requirements'}
                  value={password}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  className={`${INPUT_BASE} pr-16 ${passwordError ? INPUT_BAD : INPUT_OK}`}
                />
                <button suppressHydrationWarning
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ds-muted"
                >
                  {passwordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              {passwordError && (
                <p id="new-password-error" role="alert" className="text-[11px] font-semibold text-ds-danger">
                  {passwordError}
                </p>
              )}
              <p id="password-requirements" className="text-[11px] text-ds-muted">
                At least {PASSWORD_MIN_LENGTH} characters
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-xs font-semibold text-ds-body">
                Confirm new password
              </label>
              <div className="relative">
                <input suppressHydrationWarning
                  id="confirm-password"
                  type={confirmVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  aria-invalid={!!confirmationError}
                  aria-describedby={confirmationError ? 'confirm-password-error' : match ? 'confirm-password-match' : undefined}
                  value={confirmPassword}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError('');
                  }}
                  className={`${INPUT_BASE} pr-16 ${confirmationError ? INPUT_BAD : INPUT_OK}`}
                />
                <button suppressHydrationWarning
                  type="button"
                  onClick={() => setConfirmVisible((visible) => !visible)}
                  aria-label={confirmVisible ? 'Hide confirmation' : 'Show confirmation'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ds-muted"
                >
                  {confirmVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              {confirmationError && (
                <p id="confirm-password-error" role="alert" className="text-[11px] font-semibold text-ds-danger">
                  {confirmationError}
                </p>
              )}
              {!confirmationError && match && (
                <p id="confirm-password-match" role="status" className="text-[11px] font-semibold text-[#16A34A]">
                  Passwords match
                </p>
              )}
            </div>

            <button suppressHydrationWarning
              type="submit"
              disabled={loading || mismatch || updated}
              aria-busy={loading}
              className="w-full h-12 mt-2 bg-ds-accent hover:bg-ds-accent-strong text-white font-bold text-sm rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-ds-muted">
          <Link href="/login" className="font-bold text-ds-accent hover:text-ds-accent-strong">
            Back to sign in
          </Link>
        </p>
      </main>
      <footer className="mt-8 text-center text-xs text-ds-muted">
        © 2026 Aram Events. Events Beyond Boundaries.
      </footer>
    </div>
  );
}
