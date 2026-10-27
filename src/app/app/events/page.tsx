'use client';

import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { EventsHeader } from '@/components/events/EventsHeader';
import { EventsToolbar } from '@/components/events/EventsToolbar';
import { EventGrid } from '@/components/events/EventGrid';
import { EventsEmptyState } from '@/components/events/EventsEmptyState';
import { EventsSkeletonGrid } from '@/components/events/EventsSkeletonGrid';
import { EventsErrorState } from '@/components/events/EventsErrorState';

export default function EventsListPage() {
  const { events, currentUser, isHydrated, refreshContext } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Derive available statuses dynamically from existing events and supported statuses
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>(['draft', 'published', 'archived']);
    events.forEach((e) => {
      if (e.status) statuses.add(e.status.toLowerCase().trim());
    });
    return Array.from(statuses).sort();
  }, [events]);

  // Filter events based on search and status
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Status Filter
      if (statusFilter !== 'all' && event.status?.toLowerCase() !== statusFilter) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const searchTarget = [
          event.name,
          event.type,
          event.format,
          event.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchTarget.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [events, searchQuery, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setHasError(false);
    try {
      await refreshContext();
    } catch {
      setHasError(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-ds-canvas">
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0 bg-ds-canvas min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 overflow-y-auto w-full">
          {/* Portfolio Page Header */}
          <EventsHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

          {/* Loading Skeleton */}
          {!isHydrated || isRetrying ? (
            <EventsSkeletonGrid />
          ) : hasError ? (
            /* Error State with Retry */
            <EventsErrorState onRetry={handleRetry} />
          ) : events.length === 0 ? (
            /* Zero Events State */
            <EventsEmptyState isSearchEmpty={false} />
          ) : (
            <>
              {/* Search & Status Filter Toolbar */}
              <EventsToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                availableStatuses={availableStatuses}
              />

              {/* Event Cards Grid or Filtered Empty State */}
              {filteredEvents.length > 0 ? (
                <EventGrid events={filteredEvents} />
              ) : (
                <EventsEmptyState isSearchEmpty={true} clearFilters={clearFilters} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
