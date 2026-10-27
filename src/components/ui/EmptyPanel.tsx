import React from 'react';

export function EmptyPanel({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ds-accent-soft text-ds-accent">
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
      </span>
      <h3 className="mt-3 font-space text-base font-bold text-ds-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ds-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
