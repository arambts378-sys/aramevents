'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { verifyPlatformAdminAction } from '@/app/actions/superAdminActions';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/super-admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (requiresMfa && mfaFactorId) {
        // Step 2: MFA Challenge Verification
        const { data: challengeData, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: mfaFactorId });

        if (challengeError) {
          setErrorMessage(challengeError.message || 'MFA challenge failed.');
          setLoading(false);
          return;
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeData.id,
          code: mfaCode.trim(),
        });

        if (verifyError) {
          setErrorMessage('Invalid MFA code. Please try again.');
          setLoading(false);
          return;
        }

        // Verify admin permissions on server
        const adminCheck = await verifyPlatformAdminAction();
        if (!adminCheck.authorized) {
          await supabase.auth.signOut();
          setErrorMessage(adminCheck.message || 'Access denied. Platform administrator credentials required.');
          setLoading(false);
          return;
        }

        router.push(nextUrl);
        router.refresh();
        return;
      }

      // Step 1: Sign in with email and password
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setErrorMessage(
          signInError.message.includes('Invalid login credentials')
            ? 'Invalid administrator credentials. Please check your email and password.'
            : signInError.message,
        );
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMessage('Authentication failed.');
        setLoading(false);
        return;
      }

      // Check if MFA is required
      const { data: mfaFactors, error: mfaError } = await supabase.auth.mfa.listFactors();
      if (!mfaError && mfaFactors?.totp && mfaFactors.totp.length > 0) {
        const verifiedFactor = mfaFactors.totp.find((f) => f.status === 'verified');
        if (verifiedFactor) {
          setRequiresMfa(true);
          setMfaFactorId(verifiedFactor.id);
          setLoading(false);
          return;
        }
      }

      // Server-side verification of platform admin membership & active status
      const adminCheck = await verifyPlatformAdminAction();
      if (!adminCheck.authorized) {
        await supabase.auth.signOut();
        setErrorMessage(
          adminCheck.message ||
            'Access denied. This account does not possess active platform administrator privileges.',
        );
        setLoading(false);
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch (err: any) {
      console.error('Master admin login error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full bg-ds-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ds-ink p-10 text-white lg:flex xl:p-14">
        <div className="relative flex items-center gap-3">
          <Image src="/aram-logo.png" alt="Aram" width={1382} height={418} priority className="h-8 w-auto" />
          <span className="text-[12px] font-medium text-white/60 border border-white/20 rounded-md px-1.5 py-0.5">
            Admin
          </span>
        </div>
        <div className="relative max-w-lg">
          <h2 className="font-space text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            One console for every workspace, event and audit trail.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-white/75">
            {[
              ['corporate_fare', 'Supervise tenant workspaces and plan entitlements'],
              ['policy', 'Moderate events with an append-only audit record'],
              ['lock', 'Role-based access with optional MFA verification'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">Authorized platform personnel only.</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/aram-logo.png" alt="Aram" width={1382} height={418} priority className="h-7 w-auto" />
            <span className="text-[12px] font-medium text-ds-muted border border-ds-line rounded-md px-1.5 py-0.5">
              Admin
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-[999px] border border-[#DDD6FE] bg-ds-accent-soft px-3 py-1 text-xs font-semibold text-ds-accent-strong">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">lock</span>
            Master Admin Portal
          </span>
          <h1 className="mt-4 font-space text-3xl font-bold tracking-tight text-ds-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-ds-muted">Authorized platform personnel only.</p>

          <div className="ds-card mt-7 p-6 sm:p-8">
            {errorMessage && (
              <div
                className="mb-6 flex items-start gap-3 rounded-xl border border-[#FCA5A5]/40 bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
                role="alert"
              >
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-ds-danger" aria-hidden="true">
                  error
                </span>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!requiresMfa ? (
                <>
                  <div>
                    <label htmlFor="admin-email" className="ds-label">Administrator email</label>
                    <input
                      id="admin-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@arambts.com"
                      className="ds-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-password" className="ds-label">Password</label>
                    <input
                      id="admin-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="ds-input"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="admin-mfa" className="ds-label">Multi-factor authentication code</label>
                  <input
                    id="admin-mfa"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="123456"
                    className="ds-input text-center text-lg tracking-widest font-mono"
                  />
                  <p className="mt-1.5 text-center text-xs text-ds-muted">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}

              <button type="submit" disabled={loading} className="ds-btn ds-btn-primary w-full min-h-11">
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">
                      progress_activity
                    </span>
                    <span>Verifying credentials…</span>
                  </>
                ) : requiresMfa ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">verified_user</span>
                    <span>Verify MFA code</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
                    <span>Authenticate as Master Admin</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-ds-line pt-5 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ds-muted transition-colors hover:text-ds-accent"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_back</span>
                Return to Organizer Login
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-ds-muted">
            Access attempts are logged and monitored. Unauthorized access is strictly prohibited.
          </p>
        </div>
      </main>
    </div>
  );
}
