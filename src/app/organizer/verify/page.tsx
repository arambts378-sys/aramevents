'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AramLogo } from '@/components/brand/AramLogo';

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
  const [codeFromEmail, setCodeFromEmail] = useState(false);
  // Arriving from a failed login (sent=0) means no code was just sent, so allow resending right away.
  const [cooldown, setCooldown] = useState(searchParams.get('sent') === '0' ? 0 : 45);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // The email's Copy code button lands here with the code in the URL fragment. It only fills the
  // boxes: mail security scanners open links, so verifying here could use up the code unseen.
  useEffect(() => {
    const code = window.location.hash.match(/^#code=(\d{6})$/)?.[1];
    if (!code) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fragment is only readable after mount
    setDigits(code.split(''));
    setCodeFromEmail(true);
    // Best effort: some browsers refuse clipboard writes without a click, and the boxes are already filled.
    navigator.clipboard?.writeText(code).catch(() => {});
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

    // Phone keyboards and autofill put the whole code into the first box.
    if (cleaned.length >= 6) {
      fillCode(cleaned);
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

  /** Fills the boxes from pasted text and verifies straight away once all six digits are there. */
  const fillCode = (raw: string) => {
    const code = raw.replace(/\D/g, '').slice(0, 6);
    if (!code) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < code.length; i++) {
      newDigits[i] = code[i];
    }
    setDigits(newDigits);
    inputRefs.current[Math.min(code.length, 5)]?.focus();

    if (code.length === 6) void submitCode(code);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fillCode(e.clipboardData.getData('text'));
  };

  const handlePasteButton = async () => {
    setError('');
    try {
      const text = await navigator.clipboard.readText();
      if (/\d/.test(text)) fillCode(text);
      else setError('No code found on your clipboard. Copy the code from the email first.');
    } catch {
      // The browser blocked clipboard access or does not offer it.
      setError('Your browser blocked pasting from here. Press and hold the first box, or press Ctrl+V.');
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCode(digits.join(''));
  };

  const submitCode = async (otpCode: string) => {
    if (loading || success) return;
    setError('');

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
    <div className="w-full max-w-[440px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(10,6,30,0.7)] ring-1 ring-white/40 flex flex-col items-center">
      {/* Brand Logo */}
      <Link href="/" className="flex flex-col items-center gap-2 group mb-5">
        <AramLogo size="lg" priority />
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

        {codeFromEmail && !error && !success && (
          <p role="status" className="w-full text-center text-xs font-semibold text-ds-ink">
            Your code is filled in. Press Verify Email to finish.
          </p>
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
              maxLength={index === 0 ? 6 : 1}
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

        <button
          type="button"
          onClick={handlePasteButton}
          disabled={loading || success}
          className="-mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-ds-accent transition-colors hover:text-ds-accent-strong disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">content_paste</span>
          Paste code
        </button>

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
    <div className="relative min-h-dvh bg-stage-night selection:bg-ds-accent/20 selection:text-ds-accent">
      {/* Same background as the sign-up page this one continues from. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <Image
          src="/organizer-signup-background.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-stage-night/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(18,10,38,0.65)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-[440px] bg-white rounded-2xl p-9 border border-ds-line flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-ds-accent border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <VerifyForm />
      </Suspense>
      <p className="mt-4 text-center text-[12px] text-white/55">
        &copy; {new Date().getFullYear()} Aram Events. Events Beyond Boundaries.
      </p>
      </div>
    </div>
  );
}
