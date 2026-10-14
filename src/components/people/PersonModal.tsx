'use client';

import React, { useState, useEffect } from 'react';
import {
  createPerson,
  updatePerson,
  CreatePersonInput,
  UpdatePersonInput,
} from '@/services/peopleService';
import { Person, EventPersonType, EventPerson } from '@/types';

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

    if (!trimmedFirst) {
      setErrorMessage('First Name is required.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
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
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#E6E2F0] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E2F0] bg-[#FAF9FF]">
          <div>
            <h2
              id="person-modal-title"
              className="text-lg font-bold text-[#17152B] tracking-tight"
            >
              {isEditing ? 'Edit Person' : 'Add Person'}
            </h2>
            <p className="text-xs text-[#77738A] mt-0.5">
              {isEditing
                ? 'Update contact and organizational details.'
                : 'Add a person to your directory or event.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-[#77738A] hover:text-[#17152B] p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-6 gap-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* If legacy onSave is present, show Person Type radio toggle */}
          {onSave && (
            <div>
              <label className="block text-xs font-bold text-[#17152B] mb-1.5">
                Person Type <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-[#17152B] cursor-pointer">
                  <input
                    type="radio"
                    name="person_type"
                    value="attendee"
                    checked={personType === 'attendee'}
                    onChange={(e) => setPersonType(e.target.value as EventPersonType)}
                    disabled={isEditing}
                    className="accent-[#7C5CFC]"
                  />
                  <span>Attendee</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#17152B] cursor-pointer">
                  <input
                    type="radio"
                    name="person_type"
                    value="staff"
                    checked={personType === 'staff'}
                    onChange={(e) => setPersonType(e.target.value as EventPersonType)}
                    disabled={isEditing}
                    className="accent-[#7C5CFC]"
                  />
                  <span>Staff</span>
                </label>
              </div>
            </div>
          )}

          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="person-first-name"
                className="block text-xs font-bold text-[#17152B] mb-1.5"
              >
                First Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                id="person-first-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Santhosh"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-xs sm:text-sm text-[#17152B] placeholder-[#A19DAE] focus:outline-none focus:border-[#7C5CFC] transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="person-last-name"
                className="block text-xs font-bold text-[#17152B] mb-1.5"
              >
                Last Name
              </label>
              <input
                type="text"
                id="person-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. S"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-xs sm:text-sm text-[#17152B] placeholder-[#A19DAE] focus:outline-none focus:border-[#7C5CFC] transition-colors"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="person-email"
              className="block text-xs font-bold text-[#17152B] mb-1.5"
            >
              Email Address <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="email"
              id="person-email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@domain.com"
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-xs sm:text-sm text-[#17152B] placeholder-[#A19DAE] focus:outline-none focus:border-[#7C5CFC] transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="person-phone"
              className="block text-xs font-bold text-[#17152B] mb-1.5"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="person-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-xs sm:text-sm text-[#17152B] placeholder-[#A19DAE] focus:outline-none focus:border-[#7C5CFC] transition-colors"
            />
          </div>

          {/* Organization & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="person-org"
                className="block text-xs font-bold text-[#17152B] mb-1.5"
              >
                Organization
              </label>
              <input
                type="text"
                id="person-org"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Aram Academy"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-xs sm:text-sm text-[#17152B] placeholder-[#A19DAE] focus:outline-none focus:border-[#7C5CFC] transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="person-title"
                className="block text-xs font-bold text-[#17152B] mb-1.5"
              >
                Job Title
              </label>
              <input
                type="text"
                id="person-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Director"
                disabled={loading}
                className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-xs sm:text-sm text-[#17152B] placeholder-[#A19DAE] focus:outline-none focus:border-[#7C5CFC] transition-colors"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-[#E6E2F0]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-[#E6E2F0] rounded-xl text-xs font-semibold text-[#77738A] hover:text-[#17152B] hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              id="btn-save-person"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
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
