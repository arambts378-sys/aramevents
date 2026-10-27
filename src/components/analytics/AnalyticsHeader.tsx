'use client';

import React from 'react';
import { DateRangePreset } from '@/services/analyticsService';

interface EventOption {
  id: string;
  name: string;
}

interface AnalyticsHeaderProps {
  events: EventOption[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  dateRange: DateRangePreset;
  onSelectDateRange: (range: DateRangePreset) => void;
  customStartDate: string;
  customEndDate: string;
  onChangeCustomDates: (start: string, end: string) => void;
  onOpenMobileMenu?: () => void;
}

export function AnalyticsHeader({
  events,
  selectedEventId,
  onSelectEvent,
  dateRange,
  onSelectDateRange,
  customStartDate,
  customEndDate,
  onChangeCustomDates,
  onOpenMobileMenu,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-ds-line">
      {/* Top Row: Title + Mobile Menu Toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ds-ink tracking-tight">
            Analytics & Insights
          </h1>
          <p className="text-xs sm:text-sm text-ds-muted mt-1 font-normal">
            Track event performance, attendee registration velocity, and live checkpoint operations.
          </p>
        </div>

        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ds-ink bg-white border border-ds-line rounded-xl shadow-xs"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-base">menu</span>
            <span>Menu</span>
          </button>
        )}
      </div>

      {/* Filter Row: Horizontally aligned on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Event Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-ds-line rounded-xl shadow-xs">
            <span className="material-symbols-outlined text-ds-accent text-lg shrink-0">
              calendar_month
            </span>
            <label htmlFor="analytics-event-select" className="text-xs font-semibold text-ds-muted shrink-0">
              Event:
            </label>
            <select
              id="analytics-event-select"
              value={selectedEventId}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="bg-transparent text-xs font-bold text-ds-ink focus:outline-none cursor-pointer w-full sm:w-auto pr-2"
            >
              <option value="all">All Events ({events.length})</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Preset Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-ds-line rounded-xl shadow-xs">
            <span className="material-symbols-outlined text-ds-accent text-lg shrink-0">
              date_range
            </span>
            <label htmlFor="analytics-date-select" className="text-xs font-semibold text-ds-muted shrink-0">
              Date:
            </label>
            <select
              id="analytics-date-select"
              value={dateRange}
              onChange={(e) => onSelectDateRange(e.target.value as DateRangePreset)}
              className="bg-transparent text-xs font-bold text-ds-ink focus:outline-none cursor-pointer w-full sm:w-auto pr-2"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if 'custom' is selected */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-ds-line rounded-xl shadow-xs text-xs animate-in fade-in duration-150">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onChangeCustomDates(e.target.value, customEndDate)}
              aria-label="Start date"
              className="bg-ds-canvas border border-ds-line rounded-lg px-2 py-1 text-xs font-medium text-ds-ink focus:outline-none focus:border-ds-accent"
            />
            <span className="text-ds-muted font-bold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onChangeCustomDates(customStartDate, e.target.value)}
              aria-label="End date"
              className="bg-ds-canvas border border-ds-line rounded-lg px-2 py-1 text-xs font-medium text-ds-ink focus:outline-none focus:border-ds-accent"
            />
          </div>
        )}
      </div>
    </div>
  );
}
