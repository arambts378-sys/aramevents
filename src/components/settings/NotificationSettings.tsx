'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

interface NotificationOption {
  key: 'notify_registration_updates' | 'notify_event_updates' | 'notify_check_in_updates' | 'notify_integration_alerts';
  title: string;
  description: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: 'notify_registration_updates',
    title: 'Registration Updates',
    description: 'Receive notifications when attendees complete new registrations or ticket purchases.',
  },
  {
    key: 'notify_event_updates',
    title: 'Event Schedule & Website Changes',
    description: 'Receive notifications when event times, venues, or website draft statuses are updated.',
  },
  {
    key: 'notify_check_in_updates',
    title: 'Check-in Activity Alerts',
    description: 'Receive real-time alerts when check-in milestones and checkpoints are reached on event day.',
  },
  {
    key: 'notify_integration_alerts',
    title: 'Integration & Sync Alerts',
    description: 'Receive urgent notices if external sync jobs (email delivery, webhook, CRM) encounter errors.',
  },
];

export function NotificationSettings() {
  const { userPreferences, updateUserPreferences } = useAppContext();

  const [preferences, setPreferences] = useState({
    notify_registration_updates: true,
    notify_event_updates: true,
    notify_check_in_updates: true,
    notify_integration_alerts: true,
  });

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (userPreferences) {
      setPreferences({
        notify_registration_updates: userPreferences.notify_registration_updates ?? true,
        notify_event_updates: userPreferences.notify_event_updates ?? true,
        notify_check_in_updates: userPreferences.notify_check_in_updates ?? true,
        notify_integration_alerts: userPreferences.notify_integration_alerts ?? true,
      });
    }
  }, [userPreferences]);

  const handleToggle = async (key: NotificationOption['key']) => {
    const previousValue = preferences[key];
    const newValue = !previousValue;

    // Optimistic update
    setPreferences((prev) => ({ ...prev, [key]: newValue }));
    setSavingKey(key);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateUserPreferences({
        [key]: newValue,
      });
      setSuccessMessage('Notification preference saved.');
    } catch (err: any) {
      // Rollback on failure
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      const rawMsg = err?.message || '';
      const isTechnical = /supabase|postgres|sql|relation|uuid|column/i.test(rawMsg);
      setErrorMessage(
        isTechnical || !rawMsg
          ? 'Unable to save notification preference. Please try again.'
          : rawMsg
      );
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-6 shadow-xs">
        <div className="pb-6 border-b border-[#E6E2F0]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block">
            NOTIFICATIONS
          </span>
          <h2 className="text-[20px] font-bold text-[#17152B] font-space mt-0.5">
            Alert & Messaging Preferences
          </h2>
          <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
            Configure which updates and administrative alerts you want to receive for your workspace events.
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

        {/* Notification Options List */}
        <div className="mt-6 divide-y divide-[#E6E2F0]">
          {NOTIFICATION_OPTIONS.map((item) => {
            const isChecked = preferences[item.key];
            const isPending = savingKey === item.key;

            return (
              <div
                key={item.key}
                className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5 max-w-[540px]">
                  <label
                    htmlFor={`toggle-${item.key}`}
                    className="text-[14px] font-semibold text-[#17152B] font-jakarta cursor-pointer"
                  >
                    {item.title}
                  </label>
                  <p className="text-[12px] text-[#77738A] font-jakarta">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isPending && (
                    <span className="w-3.5 h-3.5 border-2 border-[#7C5CFC]/30 border-t-[#7C5CFC] rounded-full animate-spin"></span>
                  )}
                  <button
                    type="button"
                    id={`toggle-${item.key}`}
                    role="switch"
                    aria-checked={isChecked}
                    disabled={isPending}
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] focus:ring-offset-2 disabled:opacity-50 ${
                      isChecked ? 'bg-[#7C5CFC]' : 'bg-[#E6E2F0]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        isChecked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informational Architecture Note */}
        <div className="mt-8 pt-5 border-t border-[#E6E2F0] flex items-start gap-2.5 text-[12px] text-[#77738A] font-jakarta bg-[#FAF9FF] p-3.5 rounded-xl border">
          <span className="material-symbols-outlined text-[18px] text-[#7C5CFC] mt-0.5 shrink-0">
            info
          </span>
          <div>
            <span className="font-semibold text-[#17152B] block">Notification Delivery Architecture</span>
            <span>
              Your notification preferences are securely saved to your account and persistent across sessions. Active dispatch channels (email digests and in-app feeds) consume these saved preferences.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
