'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function maskEmailClient(email: string): string {
  const norm = email.trim().toLowerCase();
  const parts = norm.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local.charAt(0)}*@${domain}`;
  }
  const maskedLocal = local.charAt(0) + '•'.repeat(Math.max(4, local.length - 2)) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawEmail = searchParams.get('email') || '';

  const [email] = useState(rawEmail.trim().toLowerCase());
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // Arriving from a failed login (sent=0) means no code was just sent, so allow resending right away.
  const [cooldown, setCooldown] = useState(searchParams.get('sent') === '0' ? 0 : 45);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance to next box
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);

    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setError('');

    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Missing email address. Please return to registration and try again.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/organizer/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed. Please check the code.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Wait briefly for visual feedback then redirect to authenticated dashboard
      setTimeout(() => {
        router.push(data.redirect || '/app');
        router.refresh();
      }, 1000);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || loading) return;
    setError('');
    setResending(true);

    try {
      const response = await fetch('/api/organizer/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend verification code. Please try again later.');
        setResending(false);
        return;
      }

      // Reset digits & cooldown
      setDigits(['', '', '', '', '', '']);
      setCooldown(45);
      setResending(false);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch {
      setError('Network error. Unable to resend code.');
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-white rounded-2xl p-7 sm:p-9 border border-ds-line shadow-xl shadow-black/5 flex flex-col items-center">
      {/* Brand Logo */}
      <Link href="/" className="flex flex-col items-center gap-2 group mb-5">
        <div className="w-12 h-12 rounded-2xl bg-ds-accent flex items-center justify-center text-white shadow-md shadow-black/5 group-hover:scale-105 transition-transform duration-200">
          <span className="material-symbols-outlined text-2xl">layers</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-xl font-bold tracking-tight text-ds-ink">ARAM BTS</span>
          <span className="text-xs text-ds-muted tracking-wider font-medium">Events Beyond Boundaries</span>
        </div>
      </Link>

      {/* Title & Instructions */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-ds-ink tracking-tight">Verify your email</h1>
        <p className="text-xs text-ds-muted mt-2 font-normal">
          If this account is awaiting verification, enter the 6-digit code sent to:
        </p>
        <p className="text-xs font-bold text-ds-ink mt-1 font-mono bg-ds-canvas py-1 px-2.5 rounded-lg border border-ds-line inline-block">
          {email ? maskEmailClient(email) : 'your email address'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleVerify} className="w-full flex flex-col items-center gap-5" noValidate>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="w-full bg-ds-danger/10 border border-ds-danger/30 text-ds-danger rounded-xl p-3 text-xs font-semibold flex items-start gap-2"
          >
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="w-full bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#16A34A] rounded-xl p-3 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Email verified! Redirecting to dashboard...</span>
          </div>
        )}

        {/* 6 Digit Inputs */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={loading || success}
              aria-label={`Digit ${index + 1}`}
              className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-ds-ink bg-ds-canvas border border-ds-line rounded-xl focus:outline-none focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 transition-all disabled:opacity-50"
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || success || digits.join('').length !== 6}
          className="w-full h-11 bg-ds-accent hover:bg-ds-accent-strong text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-black/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying...</span>
            </>
          ) : success ? (
            <span>Verified</span>
          ) : (
            <span>Verify Email</span>
          )}
        </button>
      </form>

      {/* Resend & Change Email Actions */}
      <div className="mt-6 flex flex-col items-center gap-3 text-xs">
        <div className="text-ds-muted flex items-center gap-1.5">
          <span>Didn&apos;t receive the code?</span>
          {cooldown > 0 ? (
            <span className="font-semibold text-ds-ink tabular-nums">
              Resend in {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || loading}
              className="font-bold text-ds-accent hover:text-ds-accent-strong transition-colors underline-offset-2 hover:underline focus:outline-none"
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          )}
        </div>

        <Link
          href="/organizer/register"
          className="text-ds-muted hover:text-ds-ink transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Change email</span>
        </Link>

        <p className="text-ds-muted text-center">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold text-ds-accent hover:text-ds-accent-strong transition-colors underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
          {' or '}
          <Link
            href="/forgot-password"
            className="font-bold text-ds-accent hover:text-ds-accent-strong transition-colors underline-offset-2 hover:underline"
          >
            reset your password
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function OrganizerVerifyPage() {
  return (
    <div className="min-h-screen bg-ds-canvas flex flex-col justify-between items-center py-10 px-4 selection:bg-ds-accent/20 selection:text-ds-accent">
      <div />
      <Suspense
        fallback={
          <div className="w-full max-w-[440px] bg-white rounded-2xl p-9 border border-ds-line flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-ds-accent border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <VerifyForm />
      </Suspense>
      <footer className="mt-8 text-center text-xs text-ds-muted">
        © 2026 ARAM BTS. Events Beyond Boundaries.
      </footer>
    </div>
  );
}
