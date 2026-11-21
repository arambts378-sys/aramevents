'use client';

import React, { useEffect, useState } from 'react';
import type { Event } from '@/types';

type Fields = Pick<Event, 'name' | 'format' | 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'timezone' | 'location' | 'description'>;
type FieldErrors = Partial<Record<keyof Fields, string>>;

const TIMEZONES: [string, string][] = [
  ['Asia/Kolkata', 'India Standard Time (IST) — UTC+05:30'],
  ['America/New_York', 'Eastern Time (ET) — UTC-05:00 / -04:00'],
  ['America/Los_Angeles', 'Pacific Time (PT) — UTC-08:00 / -07:00'],
  ['Europe/London', 'Greenwich Mean Time / BST — UTC+00:00 / +01:00'],
  ['Europe/Berlin', 'Central European Time (CET) — UTC+01:00 / +02:00'],
  ['Asia/Singapore', 'Singapore Standard Time (SGT) — UTC+08:00'],
  ['Asia/Dubai', 'Gulf Standard Time (GST) — UTC+04:00'],
];

/** Times are stored as HH:MM:SS; time inputs want HH:MM. */
const toInputTime = (t?: string) => (t ? t.slice(0, 5) : '');

function fieldsOf(event: Event): Fields {
  return {
    name: event.name ?? '',
    format: event.format ?? '',
    startDate: event.startDate ?? '',
    startTime: toInputTime(event.startTime),
    endDate: event.endDate ?? '',
    endTime: toInputTime(event.endTime),
    timezone: event.timezone || 'Asia/Kolkata',
    location: event.location ?? '',
    description: event.description ?? '',
  };
}

/**
 * Same rules as creating an event, except dates may be in the past: organizers fix details
 * (a typo, a moved venue, the real end time) while the event is live and after it has happened.
 */
function validate(f: Fields): FieldErrors {
  const errors: FieldErrors = {};
  if (!f.name.trim()) errors.name = 'Event name is required';
  else if (f.name.trim().length > 150) errors.name = 'Event name must be 150 characters or fewer';
  if (!f.format) errors.format = 'Please select an event format';
  if (!f.startDate) errors.startDate = 'Start date is required';
  if (!f.startTime) errors.startTime = 'Start time is required';
  if (!f.endDate) errors.endDate = 'End date is required';
  if (!f.endTime) errors.endTime = 'End time is required';
  if (f.format !== 'Virtual' && !(f.location ?? '').trim()) {
    errors.location = 'Location is required for In-person and Hybrid events';
  }
  if (f.startDate && f.endDate && f.startDate > f.endDate) {
    errors.endDate = 'End date cannot be earlier than start date';
  } else if (f.startDate && f.startDate === f.endDate && f.startTime && f.endTime && f.endTime <= f.startTime) {
    errors.endTime = 'End time must be after the start time';
  }
  return errors;
}

const inputClass = (error?: string) =>
  `w-full px-3 py-2 bg-white border ${
    error ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20' : 'border-ds-line'
  } rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors shadow-xs font-jakarta disabled:opacity-60`;

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-ds-ink font-jakarta">
        {label}
      </label>
      {children}
      {error && <p className="text-red-600 text-[11px] font-medium font-jakarta">{error}</p>}
    </div>
  );
}

export function EditEventDetailsDialog({
  event,
  onSave,
  onClose,
}: {
  event: Event;
  onSave: (event: Event) => Promise<unknown>;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<Fields>(() => fieldsOf(event));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        ...event,
        name: fields.name.trim(),
        format: fields.format,
        startDate: fields.startDate,
        startTime: fields.startTime,
        endDate: fields.endDate,
        endTime: fields.endTime,
        timezone: fields.timezone,
        location: (fields.location ?? '').trim(),
        description: (fields.description ?? '').trim(),
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the event details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isLive = event.status === 'published';
  const today = new Date().toLocaleDateString('en-CA');
  const hasEnded = Boolean(event.endDate && event.endDate < today);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-event-details-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl border border-ds-line shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-ds-line">
          <div className="space-y-1">
            <h2 id="edit-event-details-title" className="text-[18px] font-bold text-ds-ink font-space">
              Edit event details
            </h2>
            <p className="text-[12px] text-ds-muted font-jakarta">
              {hasEnded
                ? 'This event has ended. You can still correct its details; registrations and tickets are not changed.'
                : isLive
                  ? 'This event is live. Changes show on your public page as soon as you save.'
                  : 'Name, date, time and location.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg text-ds-muted hover:bg-ds-accent-soft hover:text-ds-ink transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="Event name" htmlFor="edit-name" error={errors.name}>
            <input id="edit-name" value={fields.name} onChange={set('name')} disabled={saving} maxLength={150} className={inputClass(errors.name)} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Format" htmlFor="edit-format" error={errors.format}>
              <select id="edit-format" value={fields.format} onChange={set('format')} disabled={saving} className={inputClass(errors.format)}>
                <option value="" disabled>Select format</option>
                <option value="In-person">In-person</option>
                <option value="Virtual">Virtual</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </Field>
            <Field label="Time zone" htmlFor="edit-timezone">
              <select id="edit-timezone" value={fields.timezone} onChange={set('timezone')} disabled={saving} className={inputClass()}>
                {!TIMEZONES.some(([tz]) => tz === fields.timezone) && <option value={fields.timezone}>{fields.timezone}</option>}
                {TIMEZONES.map(([tz, label]) => (
                  <option key={tz} value={tz}>{label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" htmlFor="edit-start-date" error={errors.startDate}>
              <input id="edit-start-date" type="date" value={fields.startDate} onChange={set('startDate')} disabled={saving} className={inputClass(errors.startDate)} />
            </Field>
            <Field label="Start time" htmlFor="edit-start-time" error={errors.startTime}>
              <input id="edit-start-time" type="time" value={fields.startTime} onChange={set('startTime')} disabled={saving} className={inputClass(errors.startTime)} />
            </Field>
            <Field label="End date" htmlFor="edit-end-date" error={errors.endDate}>
              <input id="edit-end-date" type="date" value={fields.endDate} onChange={set('endDate')} disabled={saving} className={inputClass(errors.endDate)} />
            </Field>
            <Field label="End time" htmlFor="edit-end-time" error={errors.endTime}>
              <input id="edit-end-time" type="time" value={fields.endTime} onChange={set('endTime')} disabled={saving} className={inputClass(errors.endTime)} />
            </Field>
          </div>

          <Field label={fields.format === 'Virtual' ? 'Location (optional)' : 'Location'} htmlFor="edit-location" error={errors.location}>
            <input
              id="edit-location"
              value={fields.location}
              onChange={set('location')}
              disabled={saving}
              placeholder={fields.format === 'Virtual' ? 'Online' : 'Venue, city'}
              className={inputClass(errors.location)}
            />
          </Field>

          <Field label="Description" htmlFor="edit-description">
            <textarea id="edit-description" rows={4} value={fields.description} onChange={set('description')} disabled={saving} className={inputClass()} />
          </Field>

          {saveError && (
            <p className="text-[12px] text-red-600 font-jakarta" role="alert">{saveError}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-ds-line bg-ds-canvas/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 h-10 rounded-xl bg-white border border-ds-line text-ds-ink font-semibold text-[13px] hover:border-ds-accent transition-colors font-jakarta disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white font-semibold text-[13px] transition-colors shadow-xs font-jakarta disabled:opacity-60"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>{saving ? 'Saving…' : 'Save changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
