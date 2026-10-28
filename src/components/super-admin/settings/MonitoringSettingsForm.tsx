'use client';

import React, { useState, useTransition } from 'react';
import { updateMonitoringSettingsAction } from '@/app/actions/superAdminActions';
import type { MonitoringSettings } from '@/lib/monitoring/types';

interface FieldProps {
  id: keyof MonitoringSettings;
  label: string;
  help: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}

function NumberField({ id, label, help, unit, min, max, step = 1, value, disabled, onChange }: FieldProps) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[1fr_200px] sm:items-center sm:gap-6">
      <div>
        <label htmlFor={id} className="text-[14px] font-medium text-ds-ink">{label}</label>
        <p id={`${id}-help`} className="mt-0.5 text-[13px] text-ds-muted">{help}</p>
      </div>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          disabled={disabled}
          aria-describedby={`${id}-help`}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="ds-input pr-16 tabular-nums disabled:bg-ds-subtle disabled:text-ds-muted"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-ds-muted">{unit}</span>
      </div>
    </div>
  );
}

export function MonitoringSettingsForm({ initial, canManage }: { initial: MonitoringSettings; canManage: boolean }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = <K extends keyof MonitoringSettings>(key: K, v: MonitoringSettings[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setStatus(null);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateMonitoringSettingsAction(values);
      if (result.ok) {
        setValues(result.data);
        setSaved(result.data);
        setStatus({ tone: 'ok', text: 'Settings saved. App servers pick them up within a minute.' });
      } else {
        setStatus({ tone: 'error', text: result.message });
      }
    });
  };

  const disabled = !canManage || pending;

  return (
    <form onSubmit={save}>
      <div className="divide-y divide-ds-line">
        <div className="flex items-start justify-between gap-6 pb-4">
          <div>
            <p id="capture-label" className="text-[14px] font-medium text-ds-ink">Record database calls</p>
            <p className="mt-0.5 text-[13px] text-ds-muted">
              Count every call the app servers make to the database. Turning this off keeps existing history.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values.captureEnabled}
            aria-labelledby="capture-label"
            disabled={disabled}
            onClick={() => set('captureEnabled', !values.captureEnabled)}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-accent disabled:opacity-50 ${
              values.captureEnabled ? 'bg-ds-accent' : 'bg-ds-line-strong'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                values.captureEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <NumberField
          id="sampleRate"
          label="Share of calls to record"
          help="Lower this on very busy days. Counts are scaled back up, so totals stay comparable."
          unit="%"
          min={1}
          max={100}
          value={values.sampleRate}
          disabled={disabled || !values.captureEnabled}
          onChange={(v) => set('sampleRate', v)}
        />
        <NumberField
          id="slowCallMs"
          label="Slow call threshold"
          help="Calls that take at least this long are counted as slow and flagged amber."
          unit="ms"
          min={50}
          max={30000}
          step={50}
          value={values.slowCallMs}
          disabled={disabled}
          onChange={(v) => set('slowCallMs', v)}
        />
        <NumberField
          id="errorRateAlertPct"
          label="Failure rate warning"
          help="Highlight an application or table in red once this share of its calls fail."
          unit="%"
          min={1}
          max={100}
          value={values.errorRateAlertPct}
          disabled={disabled}
          onChange={(v) => set('errorRateAlertPct', v)}
        />
        <NumberField
          id="retentionDays"
          label="Keep call history for"
          help="Older per-minute counts are deleted automatically. Up to 90 days."
          unit="days"
          min={1}
          max={90}
          value={values.retentionDays}
          disabled={disabled}
          onChange={(v) => set('retentionDays', v)}
        />
      </div>

      <div className="mt-2 flex flex-col-reverse gap-3 border-t border-ds-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={`text-[13px] ${status?.tone === 'error' ? 'text-ds-danger' : status ? 'text-ds-success' : 'text-ds-muted'}`}
        >
          {status?.text ?? (canManage ? (dirty ? 'You have unsaved changes.' : 'Changes are recorded in the audit log.') : 'Only super admins can change these settings.')}
        </p>
        {canManage && (
          <div className="flex gap-2">
            <button
              type="button"
              className="ds-btn ds-btn-ghost"
              disabled={!dirty || pending}
              onClick={() => {
                setValues(saved);
                setStatus(null);
              }}
            >
              Discard
            </button>
            <button type="submit" className="ds-btn ds-btn-primary" disabled={!dirty || pending}>
              {pending ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
