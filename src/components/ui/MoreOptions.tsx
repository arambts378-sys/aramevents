import React from 'react';

/** Keeps rarely needed fields out of the way, so forms start with only the essentials. */
export function MoreOptions({
  label = 'More options',
  defaultOpen = false,
  children,
}: {
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-semibold text-ds-accent hover:text-ds-accent-strong font-jakarta [&::-webkit-details-marker]:hidden">
        <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180" aria-hidden="true">
          expand_more
        </span>
        <span>{label}</span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
