'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  Field,
  FooterHint,
  SaveButton,
  SelectInput,
  SettingsCard,
  StatusNotices,
  friendlyError,
} from './SettingsUI';

const EVENT_TYPES = [
  'Conference',
  'Corporate Event',
  'Workshop',
  'Exhibition',
  'Summit',
  'Networking',
  'Training',
  'Walkathon',
  'Other',
];

const EVENT_FORMATS = ['In-person', 'Virtual', 'Hybrid'];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) — UTC+05:30' },
  { value: 'America/New_York', label: 'Eastern Time (ET) — UTC-05:00 / -04:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) — UTC-08:00 / -07:00' },
  { value: 'Europe/London', label: 'Greenwich Mean Time / BST — UTC+00:00 / +01:00' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET) — UTC+01:00 / +02:00' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT) — UTC+08:00' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) — UTC+04:00' },
];

export function EventDefaultsSettings() {
  const { userPreferences, updateUserPreferences } = useAppContext();

  const [eventType, setEventType] = useState('Conference');
  const [eventFormat, setEventFormat] = useState('In-person');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [location, setLocation] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset the form whenever saved preferences change (e.g. once they load)
  const [syncedPrefs, setSyncedPrefs] = useState<typeof userPreferences>(null);
  if (userPreferences !== syncedPrefs) {
    setSyncedPrefs(userPreferences);
    if (userPreferences) {
      if (userPreferences.default_event_type) {
        setEventType(userPreferences.default_event_type);
      }
      if (userPreferences.default_event_format) {
        setEventFormat(userPreferences.default_event_format);
      }
      if (userPreferences.default_timezone) {
        setTimezone(userPreferences.default_timezone);
      }
      if (userPreferences.default_location !== undefined) {
        setLocation(userPreferences.default_location || '');
      }
    }
  }

  const clearFeedback = () => {
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await updateUserPreferences({
        default_event_type: eventType,
        default_event_format: eventFormat,
        default_timezone: timezone,
        default_location: location.trim(),
      });

      setSuccessMessage('Event defaults saved. New events will start with these values.');
    } catch (err) {
      setErrorMessage(friendlyError(err, 'Unable to save event defaults. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <StatusNotices success={successMessage} error={errorMessage} />

      <form onSubmit={handleSave}>
        <SettingsCard
          title="New event defaults"
          description="These values are pre-filled when you create an event. You can change them on any event."
          footer={
            <>
              <FooterHint>Existing events are not affected.</FooterHint>
              <SaveButton saving={isSaving} />
            </>
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Event type" htmlFor="defaultEventType">
              <SelectInput
                id="defaultEventType"
                name="defaultEventType"
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value);
                  clearFeedback();
                }}
                disabled={isSaving}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Format" htmlFor="defaultEventFormat">
              <SelectInput
                id="defaultEventFormat"
                name="defaultEventFormat"
                value={eventFormat}
                onChange={(e) => {
                  setEventFormat(e.target.value);
                  clearFeedback();
                }}
                disabled={isSaving}
              >
                {EVENT_FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </SelectInput>
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Timezone"
                htmlFor="defaultTimezone"
                description="Used for schedules and the times printed on tickets."
              >
                <SelectInput
                  id="defaultTimezone"
                  name="defaultTimezone"
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    clearFeedback();
                  }}
                  disabled={isSaving}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Venue or location"
                htmlFor="defaultLocation"
                description="Used for in-person and hybrid events. Ignored for virtual events."
              >
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-ds-muted"
                  >
                    location_on
                  </span>
                  <input
                    type="text"
                    id="defaultLocation"
                    name="defaultLocation"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      clearFeedback();
                    }}
                    placeholder="e.g. Main Auditorium, Hyderabad"
                    disabled={isSaving}
                    className="ds-input pl-9 disabled:opacity-60"
                  />
                </div>
              </Field>
            </div>
          </div>
        </SettingsCard>
      </form>
    </div>
  );
}
