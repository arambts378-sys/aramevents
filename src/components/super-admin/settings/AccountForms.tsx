'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { changeMyPasswordAction, updateMyNameAction } from '@/app/actions/superAdminActions';

function Status({ value }: { value: { ok: boolean; text: string } | null }) {
  if (!value) return null;
  return (
    <p role="status" className={`text-[13px] ${value.ok ? 'text-ds-success' : 'text-ds-danger'}`}>
      {value.text}
    </p>
  );
}

export function NameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateMyNameAction(name);
          setStatus({ ok: r.ok, text: r.message });
        });
      }}
    >
      <div>
        <label htmlFor="full-name" className="ds-label">Display name</label>
        <input id="full-name" className="ds-input" value={name} onChange={(e) => { setName(e.target.value); setStatus(null); }} autoComplete="name" maxLength={80} />
      </div>
      <button type="submit" className="ds-btn ds-btn-secondary" disabled={pending || name.trim() === initial.trim()}>
        {pending ? 'Saving…' : 'Save name'}
      </button>
      <div className="sm:col-span-2"><Status value={status} /></div>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== confirm) {
          setStatus({ ok: false, text: 'The new passwords don’t match.' });
          return;
        }
        start(async () => {
          const r = await changeMyPasswordAction(current, next);
          setStatus({ ok: r.ok, text: r.message });
          if (r.ok) {
            setCurrent('');
            setNext('');
            setConfirm('');
          }
        });
      }}
    >
      <div>
        <label htmlFor="pw-current" className="ds-label">Current password</label>
        <input id="pw-current" type="password" className="ds-input" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pw-new" className="ds-label">New password</label>
          <input id="pw-new" type="password" className="ds-input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={10} required aria-describedby="pw-hint" />
        </div>
        <div>
          <label htmlFor="pw-confirm" className="ds-label">Repeat new password</label>
          <input id="pw-confirm" type="password" className="ds-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </div>
      </div>
      <p id="pw-hint" className="text-[12px] text-ds-muted">At least 10 characters.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="ds-btn ds-btn-primary" disabled={pending}>{pending ? 'Changing…' : 'Change password'}</button>
        <Status value={status} />
      </div>
    </form>
  );
}

export function SignOutEverywhere() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="ds-btn ds-btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await createClient().auth.signOut({ scope: 'global' });
          router.push('/super-admin/login');
          router.refresh();
        })
      }
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">devices</span>
      {pending ? 'Signing out…' : 'Sign out on every device'}
    </button>
  );
}
