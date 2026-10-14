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
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-[#7C5CFC]/10 flex items-center justify-center text-[#7C5CFC] mb-4">
          <span className="material-symbols-outlined text-3xl">insights</span>
        </div>
        <h2 className="text-xl font-bold text-[#17152B] tracking-tight">
          No analytics yet
        </h2>
        <p className="text-xs sm:text-sm text-[#77738A] mt-2 mb-6">
          Create your first event to start seeing registrations and participation data.
        </p>
        <Link
          href="/app/events/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-bold text-xs rounded-xl shadow-md shadow-[#7C5CFC]/20 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Create Event</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-8 sm:p-10 shadow-xs flex flex-col items-center justify-center text-center max-w-md mx-auto my-8">
      <div className="w-12 h-12 rounded-2xl bg-[#F7F5FF] flex items-center justify-center text-[#77738A] mb-3">
        <span className="material-symbols-outlined text-2xl">filter_alt_off</span>
      </div>
      <h3 className="text-base font-bold text-[#17152B] tracking-tight">
        No records found for the selected filter
      </h3>
      <p className="text-xs text-[#77738A] mt-1.5 mb-5">
        No registrations or check-in activity match the chosen event and date window.
      </p>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F7F5FF] hover:bg-[#E6E2F0] text-[#17152B] font-bold text-xs rounded-xl border border-[#E6E2F0] transition-colors"
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
