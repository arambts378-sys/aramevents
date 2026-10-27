'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import {
  Field,
  FooterHint,
  ReadOnlyValue,
  SaveButton,
  SettingsCard,
  StatusNotices,
  friendlyError,
} from './SettingsUI';

const getRoleDisplayName = (role?: string | null) => {
  if (!role) return 'Workspace Member';
  switch (role.toLowerCase()) {
    case 'workspace_owner':
      return 'Workspace Owner';
    case 'admin':
      return 'Administrator';
    case 'editor':
      return 'Editor';
    case 'member':
      return 'Member';
    case 'viewer':
      return 'Viewer';
    default:
      return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const getInitials = (name?: string) => {
  if (!name) return 'ME';
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
};

export function AccountSettings() {
  const { currentUser, currentRole, refreshContext } = useAppContext();
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset the field whenever the saved name changes (e.g. once the profile loads)
  const [syncedName, setSyncedName] = useState<string | undefined>(undefined);
  if (currentUser?.name !== syncedName) {
    setSyncedName(currentUser?.name);
    if (currentUser?.name) setFullName(currentUser.name);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmed = fullName.trim();
    if (!trimmed) {
      setErrorMessage('Full name cannot be empty.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const supabase = createClient();

      // 1. Update public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (profileError) {
        throw profileError;
      }

      // 2. Synchronize user metadata in auth.users
      await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });

      // 3. Refresh AppContext to update sidebar and local state
      await refreshContext();

      setSuccessMessage('Your profile has been updated.');
    } catch (err) {
      setErrorMessage(friendlyError(err, 'Unable to save your changes. Please check the details and try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const roleName = getRoleDisplayName(currentRole);

  return (
    <div className="space-y-5">
      <StatusNotices success={successMessage} error={errorMessage} />

      <form onSubmit={handleSave}>
        <SettingsCard
          title="Profile"
          description="This is how you appear to teammates across the workspace."
          footer={
            <>
              <FooterHint>Your name is shown on events, activity and invites.</FooterHint>
              <SaveButton
                saving={isSaving}
                disabled={!fullName.trim() || fullName.trim() === currentUser?.name}
              />
            </>
          }
        >
          <div className="flex items-center gap-4 pb-5 mb-5 border-b border-ds-line">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ds-ink text-[15px] font-medium text-white">
              {getInitials(fullName || currentUser?.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-ds-ink">{fullName || currentUser?.name || 'Your name'}</p>
              <p className="truncate text-[13px] text-ds-muted">{currentUser?.email}</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" required>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMessage) setErrorMessage('');
                  if (successMessage) setSuccessMessage('');
                }}
                placeholder="Your full name"
                autoComplete="name"
                disabled={isSaving}
                className="ds-input disabled:opacity-60"
              />
            </Field>

            <Field label="Role" description="Set by your workspace owner.">
              <ReadOnlyValue id="roleDisplay">{roleName}</ReadOnlyValue>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Email address" description="Your email is tied to your sign-in and can't be changed here.">
                <ReadOnlyValue id="email">{currentUser?.email || '—'}</ReadOnlyValue>
              </Field>
            </div>
          </div>
        </SettingsCard>
      </form>
    </div>
  );
}
