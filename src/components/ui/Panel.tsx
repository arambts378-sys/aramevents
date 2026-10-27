import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Remove body padding (e.g. for tables that go edge to edge). */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Panel({ title, description, action, flush = false, className = '', children }: PanelProps) {
  return (
    <section className={`ds-card min-w-0 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-ds-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-space text-[15px] font-bold leading-tight text-ds-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ds-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  );
}
