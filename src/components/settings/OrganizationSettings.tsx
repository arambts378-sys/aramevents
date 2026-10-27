'use client';

import React, { useState, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import {
  Field,
  FooterHint,
  Notice,
  ReadOnlyValue,
  SaveButton,
  SettingsCard,
  Spinner,
  StatusNotices,
  friendlyError,
} from './SettingsUI';

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

  // Reset the form whenever the saved workspace changes
  const [syncedWorkspace, setSyncedWorkspace] = useState<typeof activeWorkspace>(null);
  if (activeWorkspace !== syncedWorkspace) {
    setSyncedWorkspace(activeWorkspace);
    if (activeWorkspace) {
      setName(activeWorkspace.name || '');
      setEmail(activeWorkspace.email || '');
      setLogoUrl(activeWorkspace.logo_url || null);
    }
  }

  const clearFeedback = () => {
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

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

      setSuccessMessage('Organization details updated.');
    } catch (err) {
      setErrorMessage(friendlyError(err, 'Unable to save organization details. Please try again.'));
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
      setSuccessMessage('Organization logo updated.');
    } catch (err) {
      setErrorMessage((err as { message?: string } | null)?.message || 'Unable to upload organization logo.');
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
      setSuccessMessage('Organization logo removed.');
    } catch (err) {
      setErrorMessage((err as { message?: string } | null)?.message || 'Unable to remove organization logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const unchanged =
    name.trim() === activeWorkspace?.name && email.trim() === (activeWorkspace?.email || '');

  return (
    <div className="space-y-5">
      {!isOwner && (
        <Notice tone="warning" title="View only">
          Only the workspace owner can change the organization name, contact email and logo.
        </Notice>
      )}

      <StatusNotices success={successMessage} error={errorMessage} />

      {/* Logo */}
      <SettingsCard
        title="Logo"
        description="Shown on your event websites, tickets and emails."
        footer={<FooterHint>PNG, JPEG or WebP, up to 2 MB. A square image works best.</FooterHint>}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ds-line bg-ds-subtle">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Organization logo" className="h-full w-full object-contain" />
            ) : (
              <span className="material-symbols-outlined text-[28px] text-ds-muted" aria-hidden="true">
                domain
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isOwner || isUploadingLogo}
              className="ds-btn ds-btn-secondary ds-btn-sm"
            >
              {isUploadingLogo ? <Spinner /> : (
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">upload</span>
              )}
              {logoUrl ? 'Replace' : 'Upload logo'}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={!isOwner || isUploadingLogo}
                className="ds-btn ds-btn-ghost ds-btn-sm text-ds-danger hover:bg-ds-danger-soft hover:text-ds-danger"
              >
                Remove
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoUpload}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={!isOwner || isUploadingLogo}
          />
        </div>
      </SettingsCard>

      {/* Details */}
      <form onSubmit={handleSaveDetails}>
        <SettingsCard
          title="Organization details"
          description="Your organization's public name and contact address."
          footer={
            isOwner ? (
              <>
                <FooterHint>Changes apply to all events in this workspace.</FooterHint>
                <SaveButton saving={isSaving} disabled={unchanged} />
              </>
            ) : (
              <FooterHint>Ask the workspace owner to make changes.</FooterHint>
            )
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Organization name" htmlFor="orgName" required>
              <input
                type="text"
                id="orgName"
                name="orgName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFeedback();
                }}
                placeholder="e.g. Acme Events"
                disabled={!isOwner || isSaving}
                className="ds-input disabled:bg-ds-subtle disabled:text-ds-muted disabled:cursor-not-allowed"
              />
            </Field>

            <Field
              label="Contact email"
              htmlFor="orgEmail"
              description="Used as the reply-to address for attendee emails."
            >
              <input
                type="email"
                id="orgEmail"
                name="orgEmail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFeedback();
                }}
                placeholder="contact@yourcompany.com"
                disabled={!isOwner || isSaving}
                className="ds-input disabled:bg-ds-subtle disabled:text-ds-muted disabled:cursor-not-allowed"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Workspace ID"
                description="A permanent identifier used in links and integrations. It can't be changed."
              >
                <ReadOnlyValue id="slug">{activeWorkspace?.slug || '—'}</ReadOnlyValue>
              </Field>
            </div>
          </div>
        </SettingsCard>
      </form>
    </div>
  );
}
