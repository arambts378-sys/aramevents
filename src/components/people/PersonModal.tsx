'use client';

import React, { useState, useEffect } from 'react';
import {
  createPerson,
  updatePerson,
  CreatePersonInput,
  UpdatePersonInput,
} from '@/services/peopleService';
import { Person, EventPersonType, EventPerson } from '@/types';
import { MoreOptions } from '@/components/ui/MoreOptions';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import { FieldErrors, hasErrors, validatePersonForm, withoutFieldError } from '@/lib/validation/forms';

export interface PersonFormData {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  organization?: string;
  job_title?: string;
  person_type: EventPersonType;
}

export interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Workspace-level (Centralized People Module)
  workspaceId?: string;
  onSuccess?: (savedPerson: Person) => void;
  // Event-level backward compatibility
  onSave?: (formData: PersonFormData) => Promise<void>;
  mode?: 'add' | 'edit';
  // Accepts either an EventPerson or direct person fields
  initialData?: any;
}

export function PersonModal({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
  onSave,
  mode,
  initialData,
}: PersonModalProps) {
  const isEditing = mode ? mode === 'edit' : Boolean(initialData?.id);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [personType, setPersonType] = useState<EventPersonType>('attendee');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Handle EventPerson structure (initialData.person) or direct person structure
        const p = initialData.person || initialData;
        setFirstName(p.first_name || '');
        setLastName(p.last_name || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setOrganization(p.organization || '');
        setJobTitle(p.job_title || '');
        setPersonType(initialData.person_type || 'attendee');
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setOrganization('');
        setJobTitle('');
        setPersonType('attendee');
      }
      setErrorMessage(null);
      setFieldErrors({});
      setLoading(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedOrg = organization.trim();
    const trimmedJob = jobTitle.trim();

    const found = validatePersonForm({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      organization,
      job_title: jobTitle,
    });
    setFieldErrors(found);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. If invoked via legacy event-specific callback
      if (onSave) {
        await onSave({
          first_name: trimmedFirst,
          last_name: trimmedLast || undefined,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          organization: trimmedOrg || undefined,
          job_title: trimmedJob || undefined,
          person_type: personType,
        });
        onClose();
        return;
      }

      // 2. Otherwise invoke centralized People service
      if (!workspaceId) {
        throw new Error('Workspace ID is required.');
      }

      const pId = initialData?.person?.id || initialData?.id;

      if (isEditing && pId) {
        const updateInput: UpdatePersonInput = {
          first_name: trimmedFirst,
          last_name: trimmedLast || null,
          email: trimmedEmail,
          phone: trimmedPhone || null,
          organization: trimmedOrg || null,
          job_title: trimmedJob || null,
        };

        const result = await updatePerson(pId, updateInput, workspaceId);
        if (onSuccess) onSuccess(result);
        onClose();
      } else {
        const createInput: CreatePersonInput = {
          first_name: trimmedFirst,
          last_name: trimmedLast || null,
          email: trimmedEmail,
          phone: trimmedPhone || null,
          organization: trimmedOrg || null,
          job_title: trimmedJob || null,
        };

        const result = await createPerson(createInput, workspaceId);
        if (onSuccess) onSuccess(result);
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving person:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-ds-line overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ds-line bg-ds-subtle">
          <div>
            <h2
              id="person-modal-title"
              className="text-lg font-bold text-ds-ink tracking-tight"
            >
              {isEditing ? 'Edit Person' : 'Add Person'}
            </h2>
            <p className="text-xs text-ds-muted mt-0.5">
              {isEditing
                ? 'Update contact details.'
                : 'Only a name and email are needed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-ds-muted hover:text-ds-ink p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} onChange={(e) => setFieldErrors((prev) => withoutFieldError(prev, (e.target as unknown as HTMLInputElement).name))} noValidate className="flex flex-col flex-1 overflow-y-auto p-6 gap-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* If legacy onSave is present, show Person Type radio toggle */}
          {onSave && (
            <div>
              <span className="block text-xs font-bold text-ds-ink mb-1.5">Role</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
                {([
                  ['attendee', 'Attendee', 'Coming to the event'],
                  ['staff', 'Team', 'Helping run the event'],
                ] as const).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={personType === value}
                    onClick={() => setPersonType(value)}
                    disabled={isEditing}
                    className={`p-2.5 rounded-xl border text-left transition-colors disabled:opacity-60 ${
                      personType === value
                        ? 'border-ds-accent bg-ds-accent-soft'
                        : 'border-ds-line hover:border-ds-accent/40'
                    }`}
                  >
                    <span className="block text-xs font-bold text-ds-ink">{label}</span>
                    <span className="block text-[11px] text-ds-muted">{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="person-first-name"
                className="block text-xs font-bold text-ds-ink mb-1.5"
              >
                First Name <span className="text-ds-danger">*</span>
              </label>
              <input
                type="text"
                id="person-first-name"
                required
                name="first_name"
 aria-invalid={Boolean(fieldErrors.first_name)}
 value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Santhosh"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-xs sm:text-sm text-ds-ink placeholder-ds-muted focus:outline-none focus:border-ds-accent transition-colors"
              />
<FieldError message={fieldErrors.first_name} />
            </div>
            <div>
              <label
                htmlFor="person-last-name"
                className="block text-xs font-bold text-ds-ink mb-1.5"
              >
                Last Name
              </label>
              <input
                type="text"
                id="person-last-name"
                name="last_name"
 aria-invalid={Boolean(fieldErrors.last_name)}
 value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. S"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-xs sm:text-sm text-ds-ink placeholder-ds-muted focus:outline-none focus:border-ds-accent transition-colors"
              />
<FieldError message={fieldErrors.last_name} />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="person-email"
              className="block text-xs font-bold text-ds-ink mb-1.5"
            >
              Email Address <span className="text-ds-danger">*</span>
            </label>
            <input
              type="email"
              id="person-email"
              required
              name="email"
 aria-invalid={Boolean(fieldErrors.email)}
 value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@domain.com"
              disabled={loading}
              readOnly={Boolean(onSave) && isEditing}
              className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-xs sm:text-sm text-ds-ink placeholder-ds-muted focus:outline-none focus:border-ds-accent transition-colors"
            />
<FieldError message={fieldErrors.email} />
          </div>

          <MoreOptions label="Add phone, organization and job title" defaultOpen={Boolean(phone || organization || jobTitle)}>
          {/* Phone */}
          <div>
            <label
              htmlFor="person-phone"
              className="block text-xs font-bold text-ds-ink mb-1.5"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="person-phone"
              name="phone"
 aria-invalid={Boolean(fieldErrors.phone)}
 value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-xs sm:text-sm text-ds-ink placeholder-ds-muted focus:outline-none focus:border-ds-accent transition-colors"
            />
<FieldError message={fieldErrors.phone} />
          </div>

          {/* Organization & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="person-org"
                className="block text-xs font-bold text-ds-ink mb-1.5"
              >
                Organization
              </label>
              <input
                type="text"
                id="person-org"
                name="organization"
 aria-invalid={Boolean(fieldErrors.organization)}
 value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Aram Academy"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-xs sm:text-sm text-ds-ink placeholder-ds-muted focus:outline-none focus:border-ds-accent transition-colors"
              />
<FieldError message={fieldErrors.organization} />
            </div>
            <div>
              <label
                htmlFor="person-title"
                className="block text-xs font-bold text-ds-ink mb-1.5"
              >
                Job Title
              </label>
              <input
                type="text"
                id="person-title"
                name="job_title"
 aria-invalid={Boolean(fieldErrors.job_title)}
 value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Director"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-xs sm:text-sm text-ds-ink placeholder-ds-muted focus:outline-none focus:border-ds-accent transition-colors"
              />
<FieldError message={fieldErrors.job_title} />
            </div>
          </div>

          </MoreOptions>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-ds-line">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-ds-line rounded-xl text-xs font-semibold text-ds-muted hover:text-ds-ink hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              id="btn-save-person"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Add Person'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PersonModal;
