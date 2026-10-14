'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';

export function SecuritySettings() {
  const router = useRouter();
  const { currentUser } = useAppContext();

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Sign out state
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setPasswordSuccess('Your password has been updated successfully.');
      // Clear sensitive fields immediately
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const rawMsg = err?.message || '';
      const isTechnical = /supabase|postgres|sql|jwt|internal/i.test(rawMsg);
      setPasswordError(
        isTechnical || !rawMsg
          ? 'Unable to update password. Please check your requirements and try again.'
          : rawMsg
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      router.push('/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Management Card */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="pb-6 border-b border-[#E6E2F0]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">
            SECURITY & CREDENTIALS
          </span>
          <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">
            Password & Authentication
          </h2>
          <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
            Update your account password to maintain secure access to your event workspace.
          </p>
        </div>

        {/* Feedback Messages */}
        {passwordSuccess && (
          <div
            className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-[13px] font-jakarta"
            role="status"
          >
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">
              check_circle
            </span>
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div
            className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2.5 text-[13px] font-jakarta"
            role="alert"
          >
            <span className="material-symbols-outlined text-red-600 text-[18px]">
              error
            </span>
            <span>{passwordError}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="newPassword"
                className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
              >
                New Password <span className="text-[#DC2626]">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[12px] font-medium text-[#7C5CFC] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
                <span>{showPassword ? 'Hide password' : 'Show password'}</span>
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="newPassword"
              name="newPassword"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError('');
                if (passwordSuccess) setPasswordSuccess('');
              }}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              disabled={isUpdatingPassword}
              className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
            >
              Confirm New Password <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError('');
                if (passwordSuccess) setPasswordSuccess('');
              }}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              disabled={isUpdatingPassword}
              className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs disabled:opacity-60"
            />
          </div>

          <div className="pt-4 border-t border-[#E6E2F0] flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword || !confirmPassword}
              className="h-[42px] px-6 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer font-jakarta"
            >
              {isUpdatingPassword ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Active Session & Sign Out Card */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="pb-6 border-b border-[#E6E2F0]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">
            SESSION MANAGEMENT
          </span>
          <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">
            Active Session
          </h2>
          <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
            You are currently authenticated as{' '}
            <strong className="text-[#17152B] font-semibold">
              {currentUser?.email || 'authenticated user'}
            </strong>
            .
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF9FF] border border-[#E6E2F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#E6E2F0] flex items-center justify-center text-[#7C5CFC] shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                devices
              </span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#17152B] font-jakarta">
                Current Web Session
              </p>
              <p className="text-[11px] text-[#77738A] font-jakarta">
                Signed in securely via Supabase Auth session token.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="h-[40px] px-5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-jakarta shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out Everywhere'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
