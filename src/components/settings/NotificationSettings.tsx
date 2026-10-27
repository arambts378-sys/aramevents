'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { FooterHint, SettingsCard, Spinner, StatusNotices, Switch, friendlyError } from './SettingsUI';

interface NotificationOption {
  key: 'notify_registration_updates' | 'notify_event_updates' | 'notify_check_in_updates' | 'notify_integration_alerts';
  title: string;
  description: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: 'notify_registration_updates',
    title: 'Registrations',
    description: 'When attendees register or buy tickets.',
  },
  {
    key: 'notify_event_updates',
    title: 'Event changes',
    description: 'When event times, venues or website drafts are updated.',
  },
  {
    key: 'notify_check_in_updates',
    title: 'Check-in activity',
    description: 'Live alerts when check-in milestones are reached on event day.',
  },
  {
    key: 'notify_integration_alerts',
    title: 'Integration errors',
    description: 'When email delivery, webhooks or CRM syncs fail.',
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

  // Reset the switches whenever saved preferences change (e.g. once they load)
  const [syncedPrefs, setSyncedPrefs] = useState<typeof userPreferences>(null);
  if (userPreferences !== syncedPrefs) {
    setSyncedPrefs(userPreferences);
    if (userPreferences) {
      setPreferences({
        notify_registration_updates: userPreferences.notify_registration_updates ?? true,
        notify_event_updates: userPreferences.notify_event_updates ?? true,
        notify_check_in_updates: userPreferences.notify_check_in_updates ?? true,
        notify_integration_alerts: userPreferences.notify_integration_alerts ?? true,
      });
    }
  }

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
    } catch (err) {
      // Rollback on failure
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      setErrorMessage(friendlyError(err, 'Unable to save notification preference. Please try again.'));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <StatusNotices success={successMessage} error={errorMessage} />

      <SettingsCard
        title="Workspace notifications"
        description="Choose which updates you want to hear about for events in this workspace."
        footer={<FooterHint>Changes save automatically.</FooterHint>}
      >
        <div className="-my-1 divide-y divide-ds-line">
          {NOTIFICATION_OPTIONS.map((item) => {
            const isChecked = preferences[item.key];
            const isPending = savingKey === item.key;

            return (
              <div key={item.key} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <label htmlFor={`toggle-${item.key}`} className="cursor-pointer text-[14px] font-medium text-ds-ink">
                    {item.title}
                  </label>
                  <p className="mt-0.5 text-[13px] text-ds-muted">{item.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  {isPending && <Spinner className="text-ds-muted" />}
                  <Switch
                    id={`toggle-${item.key}`}
                    checked={isChecked}
                    disabled={isPending}
                    onChange={() => handleToggle(item.key)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>
    </div>
  );
}
