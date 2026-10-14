'use client';

import React from 'react';

interface PeopleEmptyStateProps {
  type: 'no-people' | 'no-results';
  onAddPerson?: () => void;
  onResetFilters?: () => void;
}

export function PeopleEmptyState({
  type,
  onAddPerson,
  onResetFilters,
}: PeopleEmptyStateProps) {
  if (type === 'no-people') {
    return (
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-[#7C5CFC]/10 text-[#7C5CFC] flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[30px]">group_add</span>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[#17152B] tracking-tight">
          No people yet
        </h3>
        <p className="text-xs sm:text-sm text-[#77738A] mt-1.5 max-w-sm">
          People will appear here when they are added or participate in your events.
        </p>
        {onAddPerson && (
          <button
            type="button"
            onClick={onAddPerson}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Person</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-[#77738A] flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[30px]">search_off</span>
      </div>
      <h3 className="text-base sm:text-lg font-bold text-[#17152B] tracking-tight">
        No people found
      </h3>
      <p className="text-xs sm:text-sm text-[#77738A] mt-1.5 max-w-sm">
        Try changing your search or filters.
      </p>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E6E2F0] hover:border-[#7C5CFC] text-[#17152B] hover:text-[#7C5CFC] text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
