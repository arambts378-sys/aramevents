'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WINDOWS } from './format';
import { useHydrated } from './useHydrated';

const REFRESH_MS = 30_000;

export function MonitoringToolbar({ active, renderedAt }: { active: string; renderedAt: string }) {
  const router = useRouter();
  const [live, setLive] = useState(true);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [live, router]);

  const updated = hydrated ? new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(new Date(renderedAt)) : '';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Time window" className="flex w-full gap-1 overflow-x-auto rounded-lg border border-ds-line bg-ds-subtle p-1 sm:w-auto">
        {WINDOWS.map((w) => {
          const on = w.key === active;
          return (
            <Link
              key={w.key}
              href={`/super-admin/monitoring?window=${w.key}`}
              aria-current={on ? 'page' : undefined}
              scroll={false}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-ds-accent ${
                on ? 'bg-ds-surface font-medium text-ds-ink shadow-xs' : 'text-ds-muted hover:text-ds-ink'
              }`}
            >
              {w.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 text-[13px] text-ds-muted">
        <span className="tabular-nums" aria-live="polite">
          {pending ? 'Refreshing…' : updated && `Updated ${updated}`}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-ds-accent)]"
          />
          Refresh every 30 s
        </label>
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          className="ds-btn ds-btn-secondary ds-btn-sm"
          disabled={pending}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">refresh</span>
          Refresh
        </button>
      </div>
    </div>
  );
}
