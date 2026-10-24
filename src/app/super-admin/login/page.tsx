'use client';

import React, { useState } from 'react';
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
    <div className="min-h-screen bg-[#F7F5FF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[24px]">shield_person</span>
          </div>
          <span className="font-space font-bold text-2xl text-[#17152B] tracking-tight">
            ARAM BTS
          </span>
        </div>
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#7C5CFC] border border-[#DDD6FE]">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Master Admin Portal
          </span>
        </div>
        <p className="mt-2 text-center text-sm text-[#77738A]">
          Authorized platform personnel only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-[#E6E2F0] sm:px-10">
          {errorMessage && (
            <div
              className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5]/40 text-[#991B1B] text-sm flex items-start gap-3"
              role="alert"
            >
              <span className="material-symbols-outlined text-[20px] text-[#DC2626] shrink-0 mt-0.5">
                error
              </span>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!requiresMfa ? (
              <>
                <div>
                  <label
                    htmlFor="admin-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5"
                  >
                    Administrator Email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@arambts.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D3E3] bg-white text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D3E3] bg-white text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
                  />
                </div>
              </>
            ) : (
              <div>
                <label
                  htmlFor="admin-mfa"
                  className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1.5"
                >
                  Multi-Factor Authentication Code
                </label>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8D3E3] bg-white text-center text-lg tracking-widest font-mono text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
                />
                <p className="mt-1.5 text-xs text-[#77738A] text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] hover:shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Verifying Credentials…</span>
                  </>
                ) : requiresMfa ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    <span>Verify MFA Code</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Authenticate as Master Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[#F0EDF8] text-center">
            <Link
              href="/login"
              className="text-xs font-semibold text-[#77738A] hover:text-[#7C5CFC] transition-colors inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Return to Organizer Login
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#77738A] leading-relaxed">
          Access attempts are logged and monitored. Unauthorized access is strictly prohibited and subject to legal prosecution.
        </p>
      </div>
    </div>
  );
}
