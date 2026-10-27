'use client';

import React from 'react';

interface EventsErrorStateProps {
  onRetry: () => void;
}

export function EventsErrorState({ onRetry }: EventsErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-ds-line rounded-2xl shadow-xs max-w-lg mx-auto">
      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4 border border-red-100">
        <span className="material-symbols-outlined text-[24px]">error_outline</span>
      </div>

      <h2 className="text-[20px] font-bold text-ds-ink font-space mb-2">
        Unable to load events
      </h2>

      <p className="text-[14px] text-ds-muted max-w-sm mx-auto mb-6 font-jakarta">
        We encountered a problem loading your event portfolio. Please try again.
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="h-[40px] px-5 bg-ds-accent hover:bg-ds-accent-strong text-white text-[13px] font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">refresh</span>
        <span>Retry</span>
      </button>
    </div>
  );
}
