import React from 'react';

export type StatTone = 'accent' | 'indigo' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const toneStyles: Record<StatTone, string> = {
  accent: 'bg-ds-accent/10 text-ds-accent',
  indigo: 'bg-ds-indigo/10 text-ds-indigo',
  info: 'bg-ds-info-soft text-ds-info',
  success: 'bg-ds-success-soft text-ds-success',
  warning: 'bg-ds-warning-soft text-ds-warning',
  danger: 'bg-ds-danger-soft text-ds-danger',
  neutral: 'bg-ds-line/60 text-ds-muted',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: string;
  tone?: StatTone;
}

export function StatCard({ label, value, hint, icon, tone = 'accent' }: StatCardProps) {
  return (
    <div className="ds-card ds-card-hover group relative overflow-hidden flex min-w-0 flex-col justify-between gap-3.5 p-4 sm:p-5 transition-all duration-300">
      {/* Ambient hover glow gradient */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-ds-accent/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-center justify-between gap-2 relative z-10">
        <span className="text-[12px] font-bold tracking-wide uppercase text-ds-muted">{label}</span>
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 shadow-2xs ${toneStyles[tone]}`}>
            <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{icon}</span>
          </span>
        )}
      </div>
      <div className="min-w-0 relative z-10">
        <p className="font-space text-[30px] font-bold leading-none tabular-nums text-ds-ink tracking-tight">{value}</p>
        {hint && <p className="mt-2.5 truncate text-[11px] font-medium text-ds-muted">{hint}</p>}
      </div>
    </div>
  );
}
