'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';

export function AccountSettings() {
  const { currentUser, currentRole, refreshContext } = useAppContext();
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentUser?.name) {
      setFullName(currentUser.name);
    }
  }, [currentUser?.name]);

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

      setSuccessMessage('Account details updated successfully.');
    } catch (err: any) {
      const rawMsg = err?.message || '';
      const isTechnical = /supabase|postgres|sql|relation|uuid|column/i.test(rawMsg);
      setErrorMessage(
        isTechnical || !rawMsg
          ? 'Unable to save your changes. Please check the details and try again.'
          : rawMsg
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card Header */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E6E2F0] gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">
              ACCOUNT SETTINGS
            </span>
            <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">
              Personal Profile
            </h2>
            <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
              Manage your personal information and view your active organization role.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6F1FF] border border-[#E6E2F0] text-[12px] font-semibold text-[#7C5CFC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC]"></span>
              <span>{getRoleDisplayName(currentRole)}</span>
            </span>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div
            className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-[13px] font-jakarta"
            role="status"
          >
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">
              check_circle
            </span>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2.5 text-[13px] font-jakarta"
            role="alert"
          >
            <span className="material-symbols-outlined text-red-600 text-[18px]">
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSave} className="mt-6 space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
            >
              Full Name <span className="text-[#DC2626]">*</span>
            </label>
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
              disabled={isSaving}
              className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs disabled:opacity-60"
            />
          </div>

          {/* Email Address (Display-only) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="email"
                className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
              >
                Email Address
              </label>
              <span className="text-[11px] font-medium text-[#77738A] bg-[#F6F1FF] border border-[#E6E2F0] px-2 py-0.5 rounded-full font-jakarta">
                Managed via authentication
              </span>
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={currentUser?.email || ''}
              readOnly
              disabled
              className="w-full px-4 py-2.5 bg-[#FAF9FF] border border-[#E6E2F0] rounded-xl text-[14px] text-[#77738A] cursor-not-allowed font-jakarta shadow-xs select-all"
            />
            <p className="text-[11px] text-[#77738A] font-jakarta">
              Email addresses are linked directly to your primary login credentials.
            </p>
          </div>

          {/* Role (Display-only) */}
          <div className="space-y-1.5">
            <label
              htmlFor="roleDisplay"
              className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
            >
              Organization Role
            </label>
            <input
              type="text"
              id="roleDisplay"
              name="roleDisplay"
              value={getRoleDisplayName(currentRole)}
              readOnly
              disabled
              className="w-full px-4 py-2.5 bg-[#FAF9FF] border border-[#E6E2F0] rounded-xl text-[14px] text-[#77738A] cursor-not-allowed font-jakarta shadow-xs"
            />
            <p className="text-[11px] text-[#77738A] font-jakarta">
              Role permissions determine your access to workspace events, people, and billing.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E6E2F0] flex justify-end">
            <button
              type="submit"
              disabled={isSaving || fullName.trim() === currentUser?.name}
              className="h-[42px] px-6 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer font-jakarta"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
