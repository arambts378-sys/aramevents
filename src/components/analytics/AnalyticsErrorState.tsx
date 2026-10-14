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
    <div className="bg-white border border-[#DC2626]/20 rounded-2xl p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
      <div className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626] mb-4">
        <span className="material-symbols-outlined text-2xl">error</span>
      </div>
      <h2 className="text-lg font-bold text-[#17152B] tracking-tight">
        Unable to load analytics
      </h2>
      <p className="text-xs text-[#77738A] mt-1.5 mb-6">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-bold text-xs rounded-xl shadow-md shadow-[#7C5CFC]/20 transition-all active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-base">refresh</span>
        <span>Retry</span>
      </button>
    </div>
  );
}
