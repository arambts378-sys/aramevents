import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ds-accent">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-space text-2xl font-bold leading-tight tracking-tight text-ds-ink sm:text-[28px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ds-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
