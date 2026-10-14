'use client';

import React from 'react';

export interface EventOption {
  id: string;
  name: string;
}

interface PeopleToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  events: EventOption[];
  selectedEventId: string;
  onEventChange: (eventId: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedDateRange: 'all' | '7d' | '30d' | '90d';
  onDateRangeChange: (range: 'all' | '7d' | '30d' | '90d') => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function PeopleToolbar({
  searchQuery,
  onSearchChange,
  events,
  selectedEventId,
  onEventChange,
  selectedStatus,
  onStatusChange,
  selectedDateRange,
  onDateRangeChange,
  onResetFilters,
  hasActiveFilters,
}: PeopleToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px] max-w-full lg:max-w-md">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77738A] text-[20px] pointer-events-none">
          search
        </span>
        <input
          type="text"
          id="people-search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search people..."
          className="w-full pl-10 pr-9 py-2 bg-white border border-[#E6E2F0] rounded-xl text-xs sm:text-sm text-[#17152B] placeholder-[#77738A] focus:outline-none focus:border-[#7C5CFC] transition-colors shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77738A] hover:text-[#17152B] p-0.5"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
        {/* Event Filter */}
        <div className="flex items-center gap-1.5 bg-white px-3 py-2 border border-[#E6E2F0] rounded-xl shadow-xs flex-1 sm:flex-initial min-w-[140px]">
          <span className="material-symbols-outlined text-[#7C5CFC] text-base shrink-0">
            calendar_today
          </span>
          <label htmlFor="filter-event" className="text-xs font-semibold text-[#77738A] shrink-0">
            Event:
          </label>
          <select
            id="filter-event"
            value={selectedEventId}
            onChange={(e) => onEventChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#17152B] focus:outline-none cursor-pointer w-full"
          >
            <option value="all">All Events ({events.length})</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-white px-3 py-2 border border-[#E6E2F0] rounded-xl shadow-xs flex-1 sm:flex-initial min-w-[130px]">
          <span className="material-symbols-outlined text-[#7C5CFC] text-base shrink-0">
            verified
          </span>
          <label htmlFor="filter-status" className="text-xs font-semibold text-[#77738A] shrink-0">
            Status:
          </label>
          <select
            id="filter-status"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#17152B] focus:outline-none cursor-pointer w-full"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="attended">Attended</option>
            <option value="not_attended">Not Attended</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 bg-white px-3 py-2 border border-[#E6E2F0] rounded-xl shadow-xs flex-1 sm:flex-initial min-w-[125px]">
          <span className="material-symbols-outlined text-[#7C5CFC] text-base shrink-0">
            date_range
          </span>
          <label htmlFor="filter-date" className="text-xs font-semibold text-[#77738A] shrink-0">
            Date:
          </label>
          <select
            id="filter-date"
            value={selectedDateRange}
            onChange={(e) => onDateRangeChange(e.target.value as 'all' | '7d' | '30d' | '90d')}
            className="bg-transparent text-xs font-semibold text-[#17152B] focus:outline-none cursor-pointer w-full"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* Quick Reset Button if active */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold text-[#7C5CFC] hover:text-[#5B3FE8] hover:bg-[#7C5CFC]/10 px-2.5 py-2 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
