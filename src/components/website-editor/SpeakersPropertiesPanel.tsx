'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { speakersService } from '@/services/speakers';
import { EventPerson } from '@/types';

interface SpeakersPropertiesPanelProps {
  section: any;
  updateSection: (updates: any) => void;
  eventId?: string;
  workspaceId?: string;
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  job_title: '',
  organization: '',
  bio: '',
  is_featured: false,
};

export default function SpeakersPropertiesPanel({
  section,
  updateSection,
  eventId,
  workspaceId,
}: SpeakersPropertiesPanelProps) {
  const content = section?.content || {};

  // ── Speaker list state ──────────────────────────────────────────────────────
  const [speakers, setSpeakers] = useState<EventPerson[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Add-speaker form state ──────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Removing state ──────────────────────────────────────────────────────────
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Load speakers ───────────────────────────────────────────────────────────
  const loadSpeakers = useCallback(async () => {
    if (!eventId) return;
    setLoadingList(true);
    setListError(null);
    try {
      const data = await speakersService.getEventSpeakers(eventId);
      setSpeakers(data);
    } catch {
      setListError('Failed to load speakers.');
    } finally {
      setLoadingList(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  // ── Form helpers ────────────────────────────────────────────────────────────
  const handleFormChange = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !workspaceId) return;
    if (!form.first_name.trim() || !form.email.trim()) {
      setSaveError('First name and email are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await speakersService.addSpeakerToEvent(
        workspaceId,
        eventId,
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim() || undefined,
          email: form.email.trim(),
          job_title: form.job_title.trim() || undefined,
          organization: form.organization.trim() || undefined,
        },
        {
          bio: form.bio.trim() || undefined,
          is_featured: form.is_featured,
        }
      );
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      await loadSpeakers();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to add speaker.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSpeaker = async (eventPersonId: string) => {
    if (!confirm('Remove this speaker from the event?')) return;
    setRemovingId(eventPersonId);
    try {
      await speakersService.removeSpeaker(eventPersonId);
      await loadSpeakers();
    } catch {
      alert('Failed to remove speaker. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {/* ── Section content settings ─────────────────────────────────────── */}
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Content</label>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Section Heading</label>
          <input
            type="text"
            value={content.heading || ''}
            placeholder="Speakers"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input
            type="text"
            value={content.title || ''}
            placeholder="Voices shaping what comes next."
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
      </div>

      {/* ── Presentation settings ─────────────────────────────────────────── */}
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Layout Style</label>
          <select
            className="w-full border rounded px-2 py-1.5 bg-white"
            value={content.layout || 'grid'}
            onChange={(e) => updateSection({ layout: e.target.value })}
          >
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>

        <label className="flex items-center justify-between text-sm pt-2">
          <span>Show Organization</span>
          <input
            type="checkbox"
            checked={content.showOrganization ?? true}
            onChange={(e) => updateSection({ showOrganization: e.target.checked })}
            className="w-4 h-4"
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <span>Show Role</span>
          <input
            type="checkbox"
            checked={content.showRole ?? true}
            onChange={(e) => updateSection({ showRole: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>

      {/* ── Speakers list ─────────────────────────────────────────────────── */}
      <div className="space-y-2 p-3 bg-gray-50 border rounded">
        <div className="flex items-center justify-between border-b pb-2">
          <label className="font-semibold text-brand-dark">
            Speakers {speakers.length > 0 && <span className="text-gray-400 font-normal">({speakers.length})</span>}
          </label>
          {!showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-ds-accent text-white rounded-md hover:bg-ds-accent-strong transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              Add Speaker
            </button>
          )}
        </div>

        {/* Loading / error */}
        {loadingList && (
          <div className="flex items-center gap-2 py-2 text-gray-400 text-xs">
            <span className="w-3 h-3 border-2 border-gray-300 border-t-ds-accent rounded-full animate-spin" />
            Loading speakers…
          </div>
        )}
        {listError && <p className="text-xs text-red-500">{listError}</p>}

        {/* Speaker rows */}
        {!loadingList && speakers.length === 0 && (
          <p className="text-xs text-gray-400 py-2 text-center">No speakers added yet.</p>
        )}

        {!loadingList && speakers.map((sp) => {
          const name = `${sp.person?.first_name || ''} ${sp.person?.last_name || ''}`.trim();
          const role = sp.person?.job_title || sp.person?.organization || '';
          const initials = (sp.person?.first_name?.[0] || '') + (sp.person?.last_name?.[0] || '');
          return (
            <div
              key={sp.id}
              className="flex items-center gap-2.5 p-2 bg-white border border-gray-100 rounded-lg"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-ds-accent-soft text-ds-accent flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden border border-ds-line">
                {sp.person?.avatar_url ? (
                  <img src={sp.person.avatar_url} alt={name} className="w-full h-full object-cover" />
                ) : (
                  initials || '?'
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-gray-800 truncate">{name || 'Unnamed'}</p>
                {role && <p className="text-[11px] text-gray-400 truncate">{role}</p>}
              </div>
              {/* Remove */}
              <button
                type="button"
                onClick={() => handleRemoveSpeaker(sp.id)}
                disabled={removingId === sp.id}
                className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
                title="Remove speaker"
              >
                {removingId === sp.id ? (
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin inline-block" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">remove_circle</span>
                )}
              </button>
            </div>
          );
        })}

        {/* ── Add speaker form ────────────────────────────────────────────── */}
        {showAddForm && (
          <form onSubmit={handleAddSpeaker} className="mt-2 space-y-2 border-t pt-3">
            <p className="text-[11px] font-bold uppercase text-gray-500 tracking-wide">New Speaker</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-0.5">First Name *</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => handleFormChange('first_name', e.target.value)}
                  placeholder="Jane"
                  required
                  className="w-full border rounded px-2 py-1 text-[12px] bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-0.5">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => handleFormChange('last_name', e.target.value)}
                  placeholder="Doe"
                  className="w-full border rounded px-2 py-1 text-[12px] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-0.5">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="jane@example.com"
                required
                className="w-full border rounded px-2 py-1 text-[12px] bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-0.5">Role / Title</label>
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => handleFormChange('job_title', e.target.value)}
                  placeholder="CEO"
                  className="w-full border rounded px-2 py-1 text-[12px] bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-0.5">Organization</label>
                <input
                  type="text"
                  value={form.organization}
                  onChange={(e) => handleFormChange('organization', e.target.value)}
                  placeholder="ACME Inc."
                  className="w-full border rounded px-2 py-1 text-[12px] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-0.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => handleFormChange('bio', e.target.value)}
                placeholder="Short speaker bio…"
                rows={2}
                className="w-full border rounded px-2 py-1 text-[12px] bg-white resize-none"
              />
            </div>

            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => handleFormChange('is_featured', e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span>Featured speaker</span>
            </label>

            {saveError && <p className="text-[11px] text-red-500">{saveError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-1.5 text-[12px] font-semibold bg-ds-accent text-white rounded-md hover:bg-ds-accent-strong disabled:opacity-60 transition-colors"
              >
                {saving ? 'Adding…' : 'Add Speaker'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setSaveError(null); }}
                className="px-3 py-1.5 text-[12px] font-semibold text-gray-500 bg-white border rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
