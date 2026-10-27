'use client';

import React from 'react';
import Link from 'next/link';

interface AnalyticsEmptyStateProps {
  type: 'no-events' | 'no-records';
  onResetFilters?: () => void;
}

export function AnalyticsEmptyState({ type, onResetFilters }: AnalyticsEmptyStateProps) {
  if (type === 'no-events') {
    return (
      <div className="bg-white border border-ds-line rounded-2xl p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-ds-accent/10 flex items-center justify-center text-ds-accent mb-4">
          <span className="material-symbols-outlined text-3xl">insights</span>
        </div>
        <h2 className="text-xl font-bold text-ds-ink tracking-tight">
          No analytics yet
        </h2>
        <p className="text-xs sm:text-sm text-ds-muted mt-2 mb-6">
          Create your first event to start seeing registrations and participation data.
        </p>
        <Link
          href="/app/events/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-ds-accent hover:bg-ds-accent-strong text-white font-bold text-xs rounded-xl shadow-md shadow-black/5 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Create Event</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ds-line rounded-2xl p-8 sm:p-10 shadow-xs flex flex-col items-center justify-center text-center max-w-md mx-auto my-8">
      <div className="w-12 h-12 rounded-2xl bg-ds-canvas flex items-center justify-center text-ds-muted mb-3">
        <span className="material-symbols-outlined text-2xl">filter_alt_off</span>
      </div>
      <h3 className="text-base font-bold text-ds-ink tracking-tight">
        No records found for the selected filter
      </h3>
      <p className="text-xs text-ds-muted mt-1.5 mb-5">
        No registrations or check-in activity match the chosen event and date window.
      </p>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-ds-canvas hover:bg-ds-line text-ds-ink font-bold text-xs rounded-xl border border-ds-line transition-colors"
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
