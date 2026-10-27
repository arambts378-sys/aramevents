'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import {
  fetchWorkspacePeople,
  WorkspacePersonRow,
} from '@/services/peopleService';
import { PeopleHeader } from '@/components/people/PeopleHeader';
import { PeopleToolbar } from '@/components/people/PeopleToolbar';
import { PeopleTable } from '@/components/people/PeopleTable';
import { PersonModal } from '@/components/people/PersonModal';
import { PeopleSkeleton } from '@/components/people/PeopleSkeleton';
import { PeopleEmptyState } from '@/components/people/PeopleEmptyState';
import { PeopleErrorState } from '@/components/people/PeopleErrorState';

export default function PeopleDirectoryPage() {
  const { currentUser, activeWorkspace, events, isHydrated } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  // Data fetching state
  const [people, setPeople] = useState<WorkspacePersonRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<WorkspacePersonRow | null>(null);

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim().length > 0 ||
      selectedEventId !== 'all' ||
      selectedStatus !== 'all' ||
      selectedDateRange !== 'all'
    );
  }, [searchQuery, selectedEventId, selectedStatus, selectedDateRange]);

  const loadPeople = useCallback(async () => {
    if (!activeWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchWorkspacePeople({
        workspaceId: activeWorkspace.id,
        searchQuery: searchQuery.trim() || undefined,
        eventId: selectedEventId,
        status: selectedStatus,
        dateRange: selectedDateRange,
      });

      setPeople(data);
    } catch (err: any) {
      console.error('Failed to load workspace people:', err);
      setError(err?.message || 'Unable to load people for this workspace.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, searchQuery, selectedEventId, selectedStatus, selectedDateRange]);

  // Load when active workspace or filters change
  useEffect(() => {
    if (isHydrated && activeWorkspace?.id) {
      loadPeople();
    }
  }, [isHydrated, activeWorkspace?.id, loadPeople]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEventId('all');
    setSelectedStatus('all');
    setSelectedDateRange('all');
  };

  const handleOpenAdd = () => {
    setEditingPerson(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (person: WorkspacePersonRow) => {
    setEditingPerson(person);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    // Reload people to get latest data
    loadPeople();
  };

  return (
    <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-ds-canvas">
        {/* Left Persistent Sidebar */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Content */}
        <main className="flex-1 min-w-0 bg-ds-canvas min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 overflow-y-auto w-full">
          {/* Top Breadcrumb */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5 text-xs text-ds-muted">
              <Link href="/app" className="hover:text-ds-ink transition-colors">
                Home
              </Link>
              <span>&gt;</span>
              <span className="text-ds-ink font-semibold">People</span>
            </div>
          </div>

          {/* People Header */}
          <PeopleHeader
            onAddPerson={handleOpenAdd}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* People Toolbar: Search & Filters */}
          <PeopleToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            events={events.map((e) => ({ id: e.id, name: e.name }))}
            selectedEventId={selectedEventId}
            onEventChange={setSelectedEventId}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedDateRange={selectedDateRange}
            onDateRangeChange={setSelectedDateRange}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Directory Content States */}
          {!isHydrated || (loading && !people) ? (
            <PeopleSkeleton variant="directory" />
          ) : error ? (
            <PeopleErrorState message={error} onRetry={loadPeople} />
          ) : !people || people.length === 0 ? (
            hasActiveFilters ? (
              <PeopleEmptyState
                type="no-results"
                onResetFilters={handleResetFilters}
              />
            ) : (
              <PeopleEmptyState
                type="no-people"
                onAddPerson={handleOpenAdd}
              />
            )
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs text-ds-muted px-1">
                <span>
                  Showing <strong className="text-ds-ink">{people.length}</strong> {people.length === 1 ? 'person' : 'people'}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-ds-accent hover:underline font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
              <PeopleTable
                people={people}
                onEditPerson={handleOpenEdit}
              />
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Person Modal */}
      {activeWorkspace?.id && (
        <PersonModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          workspaceId={activeWorkspace.id}
          initialData={
            editingPerson
              ? {
                  id: editingPerson.id,
                  first_name: editingPerson.first_name,
                  last_name: editingPerson.last_name,
                  email: editingPerson.email,
                  phone: editingPerson.phone,
                  organization: editingPerson.organization,
                  job_title: editingPerson.job_title,
                }
              : null
          }
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
