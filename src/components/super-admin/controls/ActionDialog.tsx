'use client';

import React, { useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ActionResult = { ok: boolean; message: string };

interface ActionDialogProps {
  /** Button text, e.g. "Block sign-in". The confirm button reuses it unless confirmLabel is set. */
  label: string;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  icon?: string;
  tone?: 'default' | 'danger';
  variant?: 'secondary' | 'ghost' | 'danger' | 'primary';
  size?: 'sm' | 'md';
  reason?: 'required' | 'optional' | 'none';
  reasonLabel?: string;
  disabled?: boolean;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  confirmPhrase?: string;
  /** Navigate here after a successful action (e.g. after deleting the page's subject). */
  redirectTo?: string;
  action: (reason: string) => Promise<ActionResult>;
}

export function ActionDialog({
  label,
  title,
  description,
  confirmLabel,
  icon,
  tone = 'default',
  variant = 'secondary',
  size = 'sm',
  reason = 'none',
  reasonLabel = 'Reason',
  disabled,
  confirmPhrase,
  redirectTo,
  action,
}: ActionDialogProps) {
  const router = useRouter();
  const confirmId = useId();
  const [typed, setTyped] = useState('');
  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonId = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = () => {
    setText('');
    setTyped('');
    setError(null);
    dialogRef.current?.showModal();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason === 'required' && text.trim().length < 3) {
      setError('Add a short reason (at least 3 characters).');
      return;
    }
    if (!phraseOk) {
      setError('Type the confirmation text exactly to continue.');
      return;
    }
    startTransition(async () => {
      const result = await action(text.trim());
      if (result.ok) {
        dialogRef.current?.close();
        if (redirectTo) {
          router.push(redirectTo);
          return;
        }
        setDone(result.message);
        setTimeout(() => setDone(null), 6000);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled || pending}
        className={`ds-btn ds-btn-${variant} ${size === 'sm' ? 'ds-btn-sm' : ''}`}
      >
        {icon && <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>}
        {label}
      </button>
      {done && (
        <span role="status" className="text-[12px] text-ds-success">
          {done}
        </span>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-ds-line bg-ds-surface p-0 text-ds-ink shadow-[var(--shadow-ds-pop)] backdrop:bg-black/40"
        onClose={() => setError(null)}
      >
        <form onSubmit={submit} className="p-5">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <div className="mt-1.5 text-[13px] leading-relaxed text-ds-muted">{description}</div>

          {reason !== 'none' && (
            <div className="mt-4">
              <label htmlFor={reasonId} className="ds-label">
                {reasonLabel}
                {reason === 'optional' && <span className="font-normal text-ds-muted"> (optional)</span>}
              </label>
              <textarea
                id={reasonId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={500}
                className="ds-input min-h-[5rem] py-2"
                placeholder="Recorded in the audit log"
              />
            </div>
          )}

          {confirmPhrase && (
            <div className="mt-4">
              <label htmlFor={confirmId} className="ds-label">
                Type <strong className="font-semibold text-ds-ink">{confirmPhrase}</strong> to confirm
              </label>
              <input
                id={confirmId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="ds-input"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-[13px] text-ds-danger">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="ds-btn ds-btn-ghost" onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <button type="submit" className={`ds-btn ${tone === 'danger' ? 'ds-btn-danger' : 'ds-btn-primary'}`} disabled={pending || !phraseOk}>
              {pending ? 'Working…' : confirmLabel ?? label}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
