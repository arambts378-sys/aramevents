'use client';

import React from 'react';

interface AnalyticsErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function AnalyticsErrorState({
  message = 'Unable to load analytics. Please try again.',
  onRetry,
}: AnalyticsErrorStateProps) {
  return (
    <div className="bg-white border border-ds-danger/20 rounded-2xl p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
      <div className="w-12 h-12 rounded-2xl bg-ds-danger/10 flex items-center justify-center text-ds-danger mb-4">
        <span className="material-symbols-outlined text-2xl">error</span>
      </div>
      <h2 className="text-lg font-bold text-ds-ink tracking-tight">
        Unable to load analytics
      </h2>
      <p className="text-xs text-ds-muted mt-1.5 mb-6">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-ds-accent hover:bg-ds-accent-strong text-white font-bold text-xs rounded-xl shadow-md shadow-black/5 transition-all active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-base">refresh</span>
        <span>Retry</span>
      </button>
    </div>
  );
}
