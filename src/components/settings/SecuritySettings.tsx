'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import { Field, FooterHint, SaveButton, SettingsCard, Spinner, StatusNotices, friendlyError } from './SettingsUI';

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

  const clearFeedback = () => {
    if (passwordError) setPasswordError('');
    if (passwordSuccess) setPasswordSuccess('');
  };

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

      setPasswordSuccess('Your password has been updated.');
      // Clear sensitive fields immediately
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(
        friendlyError(err, 'Unable to update password. Please check your requirements and try again.', /supabase|postgres|sql|jwt|internal/i)
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

  const showToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-[12px] font-medium text-ds-muted hover:text-ds-ink"
    >
      {showPassword ? 'Hide' : 'Show'}
    </button>
  );

  return (
    <div className="space-y-5">
      <StatusNotices success={passwordSuccess} error={passwordError} />

      <form onSubmit={handlePasswordUpdate}>
        <SettingsCard
          title="Password"
          description="Use a strong password you don't use for other sites."
          footer={
            <>
              <FooterHint>Must be at least 6 characters.</FooterHint>
              <SaveButton
                saving={isUpdatingPassword}
                disabled={!newPassword || !confirmPassword}
                label="Update password"
                savingLabel="Updating…"
              />
            </>
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="New password" htmlFor="newPassword" required aside={showToggle}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearFeedback();
                }}
                autoComplete="new-password"
                disabled={isUpdatingPassword}
                className="ds-input disabled:opacity-60"
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword" required>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFeedback();
                }}
                autoComplete="new-password"
                disabled={isUpdatingPassword}
                className="ds-input disabled:opacity-60"
              />
            </Field>
          </div>
        </SettingsCard>
      </form>

      <SettingsCard
        title="Sessions"
        description={
          <>
            Signed in as <span className="font-medium text-ds-ink">{currentUser?.email || 'your account'}</span>.
          </>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ds-line bg-ds-subtle text-ds-muted">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">devices</span>
            </div>
            <div>
              <p className="text-[14px] font-medium text-ds-ink">This device</p>
              <p className="text-[13px] text-ds-muted">Current browser session</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="ds-btn ds-btn-secondary ds-btn-sm self-start text-ds-danger hover:text-ds-danger sm:self-auto"
          >
            {isSigningOut ? <Spinner /> : (
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">logout</span>
            )}
            {isSigningOut ? 'Signing out…' : 'Sign out everywhere'}
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}
