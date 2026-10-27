'use client';

import React from 'react';

/* Shared building blocks for the Settings tabs, so every section has the same structure:
   a card with a title/description header, a body of fields, and a footer for hints + actions. */

export function SettingsCard({
  title,
  description,
  children,
  footer,
  tone = 'default',
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-ds-card ${
        tone === 'danger' ? 'border-ds-danger/30' : 'border-ds-line'
      }`}
    >
      <div className="px-5 pt-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-ds-ink">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-ds-muted">{description}</p>}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && (
        <div
          className={`flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
            tone === 'danger' ? 'border-ds-danger/20 bg-ds-danger-soft/40' : 'border-ds-line bg-ds-subtle'
          }`}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

export function FooterHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-ds-muted">{children}</p>;
}

export function Field({
  label,
  htmlFor,
  description,
  required,
  aside,
  children,
}: {
  label: string;
  htmlFor?: string;
  description?: React.ReactNode;
  required?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ds-ink">
          {label}
          {required && <span className="ml-0.5 text-ds-danger">*</span>}
        </label>
        {aside}
      </div>
      {children}
      {description && <p className="mt-1.5 text-[12px] text-ds-muted">{description}</p>}
    </div>
  );
}

/** Read-only value styled like a disabled input */
export function ReadOnlyValue({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className="ds-input flex items-center bg-ds-subtle text-ds-muted shadow-none select-all"
      aria-readonly="true"
    >
      <span className="truncate">{children}</span>
    </div>
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <div className="relative">
      <select {...rest} className={`ds-input appearance-none pr-9 cursor-pointer disabled:opacity-60 ${className}`}>
        {children}
      </select>
      <span
        aria-hidden="true"
        className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-ds-muted"
      >
        expand_more
      </span>
    </div>
  );
}

const NOTICE_TONES = {
  success: { box: 'border-ds-success/20 bg-ds-success-soft/60 text-ds-success', icon: 'check_circle' },
  error: { box: 'border-ds-danger/20 bg-ds-danger-soft/60 text-ds-danger', icon: 'error' },
  warning: { box: 'border-ds-warning/20 bg-ds-warning-soft/60 text-ds-warning', icon: 'warning' },
  info: { box: 'border-ds-line bg-ds-subtle text-ds-body', icon: 'info' },
} as const;

export function Notice({
  tone,
  title,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  title?: string;
  children: React.ReactNode;
}) {
  const t = NOTICE_TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] ${t.box}`}
    >
      <span className="material-symbols-outlined mt-px shrink-0 text-[18px]" aria-hidden="true">
        {t.icon}
      </span>
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>
      </div>
    </div>
  );
}

/** Success / error feedback for a section; renders nothing when both are empty */
export function StatusNotices({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return (
    <div className="space-y-2">
      {error && <Notice tone="error">{error}</Notice>}
      {success && <Notice tone="success">{success}</Notice>}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function SaveButton({
  saving,
  disabled,
  label = 'Save',
  savingLabel = 'Saving…',
  type = 'submit',
  onClick,
  id,
}: {
  saving?: boolean;
  disabled?: boolean;
  label?: string;
  savingLabel?: string;
  type?: 'submit' | 'button';
  onClick?: () => void;
  id?: string;
}) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || saving}
      className="ds-btn ds-btn-primary ds-btn-sm min-w-[88px] self-start sm:self-auto"
    >
      {saving && <Spinner />}
      {saving ? savingLabel : label}
    </button>
  );
}

export function Switch({
  id,
  checked,
  disabled,
  onChange,
  label,
}: {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-accent disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-ds-accent' : 'bg-ds-line-strong'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/** Shared error-message cleanup: hide raw database/driver errors from users */
export function friendlyError(err: unknown, fallback: string, pattern = /supabase|postgres|sql|relation|uuid|column/i) {
  const raw = (err as { message?: string } | null)?.message || '';
  return pattern.test(raw) || !raw ? fallback : raw;
}
