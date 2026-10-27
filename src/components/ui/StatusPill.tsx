import React from 'react';

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<PillTone, string> = {
  neutral: 'bg-ds-line/60 text-ds-body',
  brand: 'bg-ds-accent-soft text-ds-accent-strong',
  success: 'bg-ds-success-soft text-ds-success',
  warning: 'bg-ds-warning-soft text-ds-warning',
  danger: 'bg-ds-danger-soft text-ds-danger',
  info: 'bg-ds-info-soft text-ds-info',
};

export function StatusPill({
  tone = 'neutral',
  dot = true,
  className = '',
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[999px] px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-[999px] bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}
