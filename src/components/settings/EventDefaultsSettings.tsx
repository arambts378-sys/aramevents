'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

export function EventDefaultsSettings() {
  const { userPreferences, updateUserPreferences } = useAppContext();

  const [eventType, setEventType] = useState('Conference');
  const [eventFormat, setEventFormat] = useState('In-person');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [location, setLocation] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
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
  }, [userPreferences]);

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

      setSuccessMessage('Event defaults saved. New events will be initialized with these values.');
    } catch (err: any) {
      const rawMsg = err?.message || '';
      const isTechnical = /supabase|postgres|sql|relation|uuid|column/i.test(rawMsg);
      setErrorMessage(
        isTechnical || !rawMsg
          ? 'Unable to save event defaults. Please try again.'
          : rawMsg
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="pb-6 border-b border-[#E6E2F0]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">
            EVENT DEFAULTS
          </span>
          <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">
            Default Creation Values
          </h2>
          <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
            Set pre-filled preferences for when you create new events. You can always override these on individual events.
          </p>
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

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          {/* Default Event Type & Format (2-Column) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Event Type */}
            <div className="space-y-1.5">
              <label
                htmlFor="defaultEventType"
                className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
              >
                Default Event Type
              </label>
              <div className="relative">
                <select
                  id="defaultEventType"
                  name="defaultEventType"
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value);
                    if (errorMessage) setErrorMessage('');
                    if (successMessage) setSuccessMessage('');
                  }}
                  disabled={isSaving}
                  className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <option value="Conference">Conference</option>
                  <option value="Corporate Event">Corporate Event</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Exhibition">Exhibition</option>
                  <option value="Summit">Summit</option>
                  <option value="Networking">Networking</option>
                  <option value="Training">Training</option>
                  <option value="Walkathon">Walkathon</option>
                  <option value="Other">Other</option>
                </select>
                <span
                  className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77738A] text-[18px]"
                  data-icon="expand_more"
                >
                  expand_more
                </span>
              </div>
            </div>

            {/* Event Format */}
            <div className="space-y-1.5">
              <label
                htmlFor="defaultEventFormat"
                className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
              >
                Default Event Format
              </label>
              <div className="relative">
                <select
                  id="defaultEventFormat"
                  name="defaultEventFormat"
                  value={eventFormat}
                  onChange={(e) => {
                    setEventFormat(e.target.value);
                    if (errorMessage) setErrorMessage('');
                    if (successMessage) setSuccessMessage('');
                  }}
                  disabled={isSaving}
                  className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <option value="In-person">In-person</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
                <span
                  className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77738A] text-[18px]"
                  data-icon="expand_more"
                >
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Default Timezone */}
          <div className="space-y-1.5">
            <label
              htmlFor="defaultTimezone"
              className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
            >
              Default Timezone
            </label>
            <div className="relative">
              <select
                id="defaultTimezone"
                name="defaultTimezone"
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  if (errorMessage) setErrorMessage('');
                  if (successMessage) setSuccessMessage('');
                }}
                disabled={isSaving}
                className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs cursor-pointer disabled:opacity-60"
              >
                <option value="Asia/Kolkata">
                  India Standard Time (IST) — UTC+05:30
                </option>
                <option value="America/New_York">
                  Eastern Time (ET) — UTC-05:00 / -04:00
                </option>
                <option value="America/Los_Angeles">
                  Pacific Time (PT) — UTC-08:00 / -07:00
                </option>
                <option value="Europe/London">
                  Greenwich Mean Time / BST — UTC+00:00 / +01:00
                </option>
                <option value="Europe/Berlin">
                  Central European Time (CET) — UTC+01:00 / +02:00
                </option>
                <option value="Asia/Singapore">
                  Singapore Standard Time (SGT) — UTC+08:00
                </option>
                <option value="Asia/Dubai">
                  Gulf Standard Time (GST) — UTC+04:00
                </option>
              </select>
              <span
                className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77738A] text-[18px]"
                data-icon="expand_more"
              >
                expand_more
              </span>
            </div>
            <p className="text-[11px] text-[#77738A] font-jakarta">
              Used to format start and end times across schedules and attendee tickets.
            </p>
          </div>

          {/* Default Location */}
          <div className="space-y-1.5">
            <label
              htmlFor="defaultLocation"
              className="block text-[13px] font-semibold text-[#17152B] font-jakarta"
            >
              Default Venue / Location
            </label>
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#77738A] pointer-events-none"
                data-icon="location_on"
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
                  if (errorMessage) setErrorMessage('');
                  if (successMessage) setSuccessMessage('');
                }}
                placeholder="e.g., Main Auditorium or Headquarters Address"
                disabled={isSaving}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-colors font-jakarta shadow-xs disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-[#77738A] font-jakarta">
              Pre-filled for in-person or hybrid events. Ignored when event format is Virtual.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E6E2F0] flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="h-[42px] px-6 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer font-jakarta"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving Defaults...</span>
                </>
              ) : (
                <span>Save Event Defaults</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
