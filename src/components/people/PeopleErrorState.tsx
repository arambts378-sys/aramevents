'use client';

import React from 'react';

interface PeopleErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function PeopleErrorState({
  message = 'An unexpected error occurred while loading people data.',
  onRetry,
}: PeopleErrorStateProps) {
  return (
    <div className="bg-white border border-red-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[30px]">warning</span>
      </div>
      <h3 className="text-base sm:text-lg font-bold text-[#17152B] tracking-tight">
        Something went wrong
      </h3>
      <p className="text-xs sm:text-sm text-[#77738A] mt-1.5 max-w-sm">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[18px]">replay</span>
        <span>Try Again</span>
      </button>
    </div>
  );
}
