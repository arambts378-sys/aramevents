'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';

export function OrganizationSettings() {
  const { activeWorkspace, currentUser, updateActiveWorkspace } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = Boolean(
    currentUser && activeWorkspace && activeWorkspace.owner_id === currentUser.id
  );

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name || '');
      setEmail(activeWorkspace.email || '');
      setLogoUrl(activeWorkspace.logo_url || null);
    }
  }, [activeWorkspace]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !isOwner) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Organization name cannot be empty.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await updateActiveWorkspace({
        name: trimmedName,
        email: email.trim() || null,
      });

      setSuccessMessage('Organization details updated successfully.');
    } catch (err: any) {
      const rawMsg = err?.message || '';
      const isTechnical = /supabase|postgres|sql|relation|uuid|column/i.test(rawMsg);
      setErrorMessage(
        isTechnical || !rawMsg
          ? 'Unable to save organization details. Please try again.'
          : rawMsg
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeWorkspace || !isOwner) return;

    const file = e.target.files[0];

    // File validation: type and size
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Please select a PNG, JPEG, or WebP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Logo file size must not exceed 2MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingLogo(true);
      setErrorMessage('');
      setSuccessMessage('');

      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again before uploading.');
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${activeWorkspace.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/logos/${fileName}`;

      // Upload to organization-logos bucket (with fallback if needed)
      let bucketName = 'organization-logos';
      let uploadResult = await supabase.storage.from(bucketName).upload(filePath, file, {
        upsert: true,
      });

      if (uploadResult.error) {
        // Fallback to event-flyers if organization-logos is not yet initialized
        bucketName = 'event-flyers';
        uploadResult = await supabase.storage.from(bucketName).upload(`${user.id}/org_logos/${fileName}`, file, {
          upsert: true,
        });

        if (uploadResult.error) {
          throw new Error('Failed to upload logo image.');
        }
      }

      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadResult.data.path);

      const newLogoUrl = publicData.publicUrl;

      // Clean up previous logo file if it exists and matches path pattern
      if (logoUrl) {
        try {
          const oldPathMatch = logoUrl.split('/storage/v1/object/public/')[1];
          if (oldPathMatch) {
            const [oldBucket, ...rest] = oldPathMatch.split('/');
            const oldFilePath = rest.join('/');
            if (oldBucket && oldFilePath) {
              await supabase.storage.from(oldBucket).remove([oldFilePath]);
            }
          }
        } catch {
          // Non-blocking cleanup
        }
      }

      await updateActiveWorkspace({ logo_url: newLogoUrl });
      setLogoUrl(newLogoUrl);
      setSuccessMessage('Organization logo updated successfully.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to upload organization logo.');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!activeWorkspace || !isOwner || !logoUrl) return;

    try {
      setIsUploadingLogo(true);
      setErrorMessage('');
      setSuccessMessage('');

      const supabase = createClient();

      // Clean up storage object
      try {
        const oldPathMatch = logoUrl.split('/storage/v1/object/public/')[1];
        if (oldPathMatch) {
          const [oldBucket, ...rest] = oldPathMatch.split('/');
          const oldFilePath = rest.join('/');
          if (oldBucket && oldFilePath) {
            await supabase.storage.from(oldBucket).remove([oldFilePath]);
          }
        }
      } catch {
        // Non-blocking cleanup
      }

      await updateActiveWorkspace({ logo_url: null });
      setLogoUrl(null);
      setSuccessMessage('Organization logo removed successfully.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to remove organization logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E6E2F0] gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">
              ORGANIZATION SETTINGS
            </span>
            <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">
              Workspace Information
            </h2>
            <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
              Manage organization identity, contact email, and branding for this workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border ${
                isOwner
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOwner ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
              <span>{isOwner ? 'Workspace Owner' : 'Read Only Access'}</span>
            </span>
          </div>
        </div>

        {/* Non-owner Notice */}
        {!isOwner && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 shrink-0">
              info
            </span>
            <div className="text-[13px] font-jakarta">
              <span className="font-semibold block">Organization settings are view-only.</span>
              <span>
                Only the workspace owner has permission to change the organization name, contact email, and logo.
              </span>
            </div>
          </div>
        )}

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

        {/* Logo Section */}
        <div className="mt-6 pb-6 border-b border-[#E6E2F0]">
          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta mb-2">
            Organization Logo
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-xl bg-[#F6F1FF] border border-[#E6E2F0] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Organization Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="material-symbols-outlined text-[32px] text-[#7C5CFC]">
                  domain
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isOwner || isUploadingLogo}
                  className="px-3.5 py-1.5 bg-white border border-[#E6E2F0] hover:border-[#7C5CFC] hover:text-[#7C5CFC] text-[13px] font-semibold text-[#17152B] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 font-jakarta flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  <span>{logoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                </button>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={!isOwner || isUploadingLogo}
                    className="px-3.5 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 font-jakarta flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#77738A] font-jakarta">
                Supported formats: PNG, JPEG, WebP. Maximum size: 2MB.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={!isOwner || isUploadingLogo}
              />
            </div>
          </div>
        </div>

        {/* Form Details */}
        <form onSubmit={handleSaveDetails} className="mt-6 space-y-5">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="orgName"
              className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
            >
              Organization Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              id="orgName"
              name="orgName"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage('');
                if (successMessage) setSuccessMessage('');
              }}
              placeholder="e.g., Acme Events Corp"
              disabled={!isOwner || isSaving}
              className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs disabled:bg-[#FAF9FF] disabled:text-[#77738A] disabled:cursor-not-allowed"
            />
          </div>

          {/* Organization Slug (Read-only) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="slug"
                className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
              >
                Workspace Identifier (Slug)
              </label>
              <span className="text-[11px] font-medium text-[#77738A] bg-[#F6F1FF] border border-[#E6E2F0] px-2 py-0.5 rounded-full font-jakarta">
                Immutable
              </span>
            </div>
            <input
              type="text"
              id="slug"
              name="slug"
              value={activeWorkspace?.slug || ''}
              readOnly
              disabled
              className="w-full px-4 py-2.5 bg-[#FAF9FF] border border-[#E6E2F0] rounded-xl text-[14px] text-[#77738A] cursor-not-allowed font-jakarta shadow-xs select-all"
            />
            <p className="text-[11px] text-[#77738A] font-jakarta">
              Used for system references and workspace event routing.
            </p>
          </div>

          {/* Organization Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="orgEmail"
              className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
            >
              Organization Contact Email
            </label>
            <input
              type="email"
              id="orgEmail"
              name="orgEmail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
                if (successMessage) setSuccessMessage('');
              }}
              placeholder="contact@yourcompany.com"
              disabled={!isOwner || isSaving}
              className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs disabled:bg-[#FAF9FF] disabled:text-[#77738A] disabled:cursor-not-allowed"
            />
            <p className="text-[11px] text-[#77738A] font-jakarta">
              Primary contact address for attendee communications and organization inquiries.
            </p>
          </div>

          {/* Action Buttons */}
          {isOwner && (
            <div className="pt-4 border-t border-[#E6E2F0] flex justify-end">
              <button
                type="submit"
                disabled={
                  isSaving ||
                  (name.trim() === activeWorkspace?.name &&
                    email.trim() === (activeWorkspace?.email || ''))
                }
                className="h-[42px] px-6 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer font-jakarta"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Organization</span>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
