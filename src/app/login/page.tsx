'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password is required.');
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('confirm')) {
          setError('Your email has not been verified yet. Please complete verification before logging in.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // Check if email is confirmed
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        router.push(`/organizer/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }

      router.push('/app');
      router.refresh();
    } catch {
      setError('An unexpected error occurred during sign in.');
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
            <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-xl p-3 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3.5 py-3 bg-[#F7F5FF] border border-[#E5E1F5] rounded-xl text-xs font-semibold text-[#27243A] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
            />
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-3 bg-[#F7F5FF] border border-[#E5E1F5] rounded-xl text-xs font-semibold text-[#27243A] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
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
          </div>

          {/* Submit Sign In Button */}
          <button
            type="submit"
            disabled={loading}
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

        {error && error.includes('not been verified') && (
          <div className="w-full mt-3 text-center">
            <Link
              href={`/organizer/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`}
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