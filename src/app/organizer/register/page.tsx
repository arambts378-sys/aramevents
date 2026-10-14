'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrganizerRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit
    setError('');

    // Client-side validations
    const trimmedName = fullName.trim();
    const trimmedOrg = organizationName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!trimmedOrg || trimmedOrg.length < 2) {
      setError('Please enter your organization name (at least 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/organizer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: trimmedName,
          organizationName: trimmedOrg,
          email: trimmedEmail,
          phoneNumber: phoneNumber.trim() || undefined,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create organizer account. Please check your details.');
        setLoading(false);
        return;
      }

      // Route to verification challenge page with normalized email in query
      router.push(`/organizer/verify?email=${encodeURIComponent(trimmedEmail)}`);
    } catch {
      setError('Network error. Please verify your internet connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5FF] flex flex-col justify-between items-center py-10 px-4 selection:bg-[#7C5CFC]/20 selection:text-[#7C5CFC]">
      {/* Top Spacer */}
      <div />

      {/* Main Authentication Card */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl p-7 sm:p-9 border border-[#E6E2F0] shadow-xl shadow-[#7C5CFC]/5 flex flex-col items-center">
        {/* Brand Logo & Header */}
        <Link href="/" className="flex flex-col items-center gap-2 group mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#7C5CFC] flex items-center justify-center text-white shadow-md shadow-[#7C5CFC]/25 group-hover:scale-105 transition-transform duration-200">
            <span className="material-symbols-outlined text-2xl">layers</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-xl font-bold tracking-tight text-[#17152B]">ARAM BTS</span>
            <span className="text-xs text-[#77738A] tracking-wider font-medium">Events Beyond Boundaries</span>
          </div>
        </Link>

        {/* Heading & Subtitle */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#17152B] tracking-tight">Create your organizer account</h1>
          <p className="text-xs text-[#77738A] mt-1.5 font-normal">
            Start managing your events with ARAM BTS.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5" noValidate>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-xl p-3 text-xs font-semibold flex items-start gap-2"
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-xs font-semibold text-[#17152B]">
              Full Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="fullName"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              maxLength={100}
              className="w-full px-3.5 py-2.5 bg-[#F7F5FF] border border-[#E6E2F0] rounded-xl text-xs font-semibold text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
            />
          </div>

          {/* Organization Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="organizationName" className="text-xs font-semibold text-[#17152B]">
              Organization Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="organizationName"
              name="organization"
              type="text"
              autoComplete="organization"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Acme Events Foundation"
              maxLength={100}
              className="w-full px-3.5 py-2.5 bg-[#F7F5FF] border border-[#E6E2F0] rounded-xl text-xs font-semibold text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
            />
          </div>

          {/* Work Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-[#17152B]">
              Work Email <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              maxLength={255}
              className="w-full px-3.5 py-2.5 bg-[#F7F5FF] border border-[#E6E2F0] rounded-xl text-xs font-semibold text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
            />
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phoneNumber" className="text-xs font-semibold text-[#17152B]">
              Phone Number <span className="text-[#77738A] font-normal">(Optional)</span>
            </label>
            <input
              id="phoneNumber"
              name="tel"
              type="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              maxLength={25}
              className="w-full px-3.5 py-2.5 bg-[#F7F5FF] border border-[#E6E2F0] rounded-xl text-xs font-semibold text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-[#17152B]">
              Password <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                maxLength={128}
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#F7F5FF] border border-[#E6E2F0] rounded-xl text-xs font-semibold text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-[#77738A] hover:text-[#17152B] focus:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-semibold text-[#17152B]">
              Confirm Password <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="confirmPassword"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                maxLength={128}
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#F7F5FF] border border-[#E6E2F0] rounded-xl text-xs font-semibold text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                className="absolute right-3 text-[#77738A] hover:text-[#17152B] focus:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-3 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#7C5CFC]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Organizer Account</span>
            )}
          </button>
        </form>

        {/* Existing account link */}
        <div className="mt-5 text-center text-xs text-[#77738A]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold text-[#7C5CFC] hover:text-[#5B3FE8] transition-colors underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-[#77738A]">
        © 2026 ARAM BTS. Events Beyond Boundaries.
      </footer>
    </div>
  );
}
