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
      <div className="bg-white border border-ds-line rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-ds-accent/10 text-ds-accent flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[30px]">group_add</span>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-ds-ink tracking-tight">
          No people yet
        </h3>
        <p className="text-xs sm:text-sm text-ds-muted mt-1.5 max-w-sm">
          People will appear here when they are added or participate in your events.
        </p>
        {onAddPerson && (
          <button
            type="button"
            onClick={onAddPerson}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Person</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-ds-line rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-ds-muted flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[30px]">search_off</span>
      </div>
      <h3 className="text-base sm:text-lg font-bold text-ds-ink tracking-tight">
        No people found
      </h3>
      <p className="text-xs sm:text-sm text-ds-muted mt-1.5 max-w-sm">
        Try changing your search or filters.
      </p>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-ds-line hover:border-ds-accent text-ds-ink hover:text-ds-accent text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
