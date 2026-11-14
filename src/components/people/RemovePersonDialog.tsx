'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface RemovablePerson {
  id: string;
  fullName: string;
  email?: string | null;
  /** Events they are registered for; their registrations, tickets and check-ins are removed too */
  eventsCount?: number;
}

interface Props {
  person: RemovablePerson | null;
  onClose: () => void;
  /** Called after the person is removed, with the server's message */
  onRemoved: (message: string) => void;
}

/** Confirms and removes a person from the workspace through DELETE /api/people/:id. */
export function RemovePersonDialog({ person, onClose, onRemoved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (person && !dialog.open) dialog.showModal();
    if (!person && dialog.open) dialog.close();
  }, [person]);

  const remove = async () => {
    if (!person) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${person.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'The person could not be removed. Try again.');
      onRemoved(json.message || `${person.fullName} was removed.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const events = person?.eventsCount ?? 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        setError(null);
        onClose();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-ds-line bg-white p-0 text-ds-ink shadow-[0_20px_50px_rgba(17,17,19,0.18)] backdrop:bg-black/40"
    >
      {person && (
        <div className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600" aria-hidden="true">
              <span className="material-symbols-outlined text-[22px]">person_remove</span>
            </span>
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold">Remove {person.fullName}?</h2>
              {person.email && <p className="truncate text-[13px] text-ds-muted">{person.email}</p>}
            </div>
          </div>

          <p className="mt-4 text-[14px] leading-relaxed text-ds-body">
            {events > 0 ? (
              <>
                They are registered for <strong className="text-ds-ink">{events} {events === 1 ? 'event' : 'events'}</strong>. Removing them also
                deletes those registrations, their tickets, QR codes and check-ins. Event totals update to match.
              </>
            ) : (
              <>They are not registered for any events. Their contact details are deleted from this workspace.</>
            )}{' '}
            This can&rsquo;t be undone.
          </p>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl px-4 py-2 text-[13px] font-semibold text-ds-body hover:bg-ds-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Removing…' : 'Remove person'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
