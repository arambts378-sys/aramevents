'use client';

import React, { useState } from 'react';
import { CONTACT_TOPICS } from '@/lib/site';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

const field =
  'w-full rounded-xl border bg-white px-4 py-3 text-[0.9375rem] text-mk-ink placeholder:text-mk-muted focus:outline-none focus:ring-2 focus:ring-mk-violet/30';

export function ContactForm({ initialTopic }: { initialTopic?: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus({ kind: 'sending' });
    setErrors({});
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(json.fieldErrors || {});
        setStatus({ kind: 'error', message: json.error || 'Your message could not be sent. Try again in a few minutes.' });
        return;
      }
      setStatus({ kind: 'sent' });
    } catch {
      setStatus({ kind: 'error', message: 'You appear to be offline. Check your connection and try again.' });
    }
  };

  if (status.kind === 'sent') {
    return (
      <div role="status" className="rounded-[22px] border border-mk-line bg-white p-8">
        <p className="font-display text-[1.5rem] font-semibold text-mk-ink">Message sent.</p>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-mk-body">We will reply to the email address you gave us.</p>
      </div>
    );
  }

  const border = (name: string) => (errors[name] ? 'border-ds-danger' : 'border-mk-line');

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-[22px] border border-mk-line bg-white p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-[0.875rem] font-semibold text-mk-ink">
          Name
          <input name="name" autoComplete="name" required className={`${field} ${border('name')}`} aria-invalid={!!errors.name} />
          {errors.name && <span className="text-[0.8125rem] font-medium text-ds-danger">{errors.name}</span>}
        </label>
        <label className="grid gap-2 text-[0.875rem] font-semibold text-mk-ink">
          Work email
          <input name="email" type="email" autoComplete="email" required className={`${field} ${border('email')}`} aria-invalid={!!errors.email} />
          {errors.email && <span className="text-[0.8125rem] font-medium text-ds-danger">{errors.email}</span>}
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-[0.875rem] font-semibold text-mk-ink">
          Organization <span className="font-normal text-mk-muted">Optional</span>
          <input name="organization" autoComplete="organization" className={`${field} border-mk-line`} />
        </label>
        <label className="grid gap-2 text-[0.875rem] font-semibold text-mk-ink">
          Topic
          <select name="topic" defaultValue={initialTopic && CONTACT_TOPICS.includes(initialTopic as never) ? initialTopic : CONTACT_TOPICS[0]} className={`${field} border-mk-line`}>
            {CONTACT_TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-[0.875rem] font-semibold text-mk-ink">
        How can we help?
        <textarea
          name="message"
          rows={6}
          required
          placeholder="Tell us about your event: what kind, roughly how many people, and when."
          className={`${field} ${border('message')} resize-y`}
          aria-invalid={!!errors.message}
        />
        {errors.message && <span className="text-[0.8125rem] font-medium text-ds-danger">{errors.message}</span>}
      </label>
      {/* Honeypot: hidden from people, filled by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {status.kind === 'error' && (
        <p role="alert" className="rounded-xl bg-ds-danger-soft px-4 py-3 text-[0.875rem] font-medium text-ds-danger">
          {status.message}
        </p>
      )}
      <button
        type="submit"
        disabled={status.kind === 'sending'}
        className="mk-focus inline-flex min-h-12 items-center justify-center justify-self-start rounded-xl bg-mk-violet px-6 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-mk-violet-strong disabled:opacity-60"
      >
        {status.kind === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
