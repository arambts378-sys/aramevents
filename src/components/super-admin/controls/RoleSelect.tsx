'use client';

import React, { useState, useTransition } from 'react';

type ActionResult = { ok: boolean; message: string };

/** A select that saves on change and reports the outcome next to itself. */
export function RoleSelect({
  label,
  value,
  options,
  disabled,
  action,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  action: (next: string) => Promise<ActionResult>;
}) {
  const [current, setCurrent] = useState(value);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        aria-label={label}
        value={current}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = current;
          setCurrent(next);
          startTransition(async () => {
            const result = await action(next);
            setMessage({ ok: result.ok, text: result.message });
            if (!result.ok) setCurrent(previous);
            setTimeout(() => setMessage(null), 5000);
          });
        }}
        className="ds-input min-h-8 w-auto py-0 pr-8 text-[13px] disabled:bg-ds-subtle disabled:text-ds-muted"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {message && (
        <span role="status" className={`text-[11px] ${message.ok ? 'text-ds-success' : 'text-ds-danger'}`}>
          {message.text}
        </span>
      )}
    </span>
  );
}
