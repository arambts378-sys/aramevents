'use client';

import React from 'react';

interface EventsToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  availableStatuses: string[];
}

export function EventsToolbar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  availableStatuses,
}: EventsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 mb-8">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <span
          className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-ds-muted pointer-events-none"
          data-icon="search"
        >
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events by name, location, or type..."
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink placeholder:text-ds-muted focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent shadow-xs transition-colors font-jakarta"
          aria-label="Search events"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted hover:text-ds-ink p-0.5 rounded-full"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="relative shrink-0 sm:w-48">
        <label htmlFor="status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] font-medium text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent shadow-xs transition-colors cursor-pointer font-jakarta"
        >
          <option value="all">All Statuses</option>
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        <span
          className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted text-[18px]"
          data-icon="expand_more"
        >
          expand_more
        </span>
      </div>
    </div>
  );
}
