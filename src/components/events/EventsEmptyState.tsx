'use client';

import React from 'react';
import Link from 'next/link';

interface EventsEmptyStateProps {
  isSearchEmpty: boolean;
  clearFilters?: () => void;
}

export function EventsEmptyState({ isSearchEmpty, clearFilters }: EventsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-ds-line rounded-2xl shadow-xs max-w-2xl mx-auto">
      <div className="w-14 h-14 bg-ds-accent-soft text-ds-accent rounded-2xl flex items-center justify-center mb-5 border border-ds-line">
        <span className="material-symbols-outlined text-[28px]">
          {isSearchEmpty ? 'search_off' : 'event_available'}
        </span>
      </div>

      {isSearchEmpty ? (
        <>
          <h2 className="text-[20px] md:text-[22px] font-bold text-ds-ink font-space mb-2">
            No events found
          </h2>
          <p className="text-[14px] text-ds-muted max-w-md mx-auto mb-6 font-jakarta">
            Try adjusting your search or status filter.
          </p>
          {clearFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-[40px] px-5 bg-white border border-ds-line hover:bg-ds-subtle text-ds-ink font-semibold text-[13px] rounded-lg transition-colors shadow-xs cursor-pointer active:scale-[0.98]"
            >
              Clear filters
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="text-[20px] md:text-[22px] font-bold text-ds-ink font-space mb-2">
            No events yet
          </h2>
          <p className="text-[14px] text-ds-muted max-w-md mx-auto mb-6 font-jakarta">
            Create your first event to start managing registrations, people and event operations from one place.
          </p>
          <Link
            href="/app/events/new"
            className="h-[44px] px-5 bg-ds-accent hover:bg-ds-accent-strong text-white text-[14px] font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Event</span>
          </Link>
        </>
      )}
    </div>
  );
}
