'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import {
  fetchPersonDetail,
  PersonDetailData,
} from '@/services/peopleService';
import { PersonDetailHeader } from '@/components/people/PersonDetailHeader';
import { PersonOverviewCards } from '@/components/people/PersonOverviewCards';
import { PersonEventHistory } from '@/components/people/PersonEventHistory';
import { PersonModal } from '@/components/people/PersonModal';
import { PeopleSkeleton } from '@/components/people/PeopleSkeleton';
import { PeopleErrorState } from '@/components/people/PeopleErrorState';

export default function PersonDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const personId = routeParams?.id as string;

  const { currentUser, activeWorkspace, isHydrated } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<PersonDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadPerson = useCallback(async () => {
    if (!activeWorkspace?.id || !personId) return;

    setLoading(true);
    setError(null);

    try {
      const detail = await fetchPersonDetail(personId, activeWorkspace.id);
      setData(detail);
    } catch (err: any) {
      console.error('Failed to load person details:', err);
      setError(err?.message || 'Person not found or unauthorized.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, personId]);

  useEffect(() => {
    if (isHydrated && activeWorkspace?.id && personId) {
      loadPerson();
    }
  }, [isHydrated, activeWorkspace?.id, personId, loadPerson]);

  const handleEditSuccess = () => {
    loadPerson();
  };

  return (
    <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-[#F7F5FF]">
        {/* Left Persistent Sidebar */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Content */}
        <main className="flex-1 min-w-0 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 overflow-y-auto w-full">
          {/* Top Breadcrumbs */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5 text-xs text-[#77738A]">
              <Link href="/app" className="hover:text-[#17152B] transition-colors">
                Home
              </Link>
              <span>&gt;</span>
              <Link href="/app/people" className="hover:text-[#17152B] transition-colors">
                People
              </Link>
              <span>&gt;</span>
              <span className="text-[#17152B] font-semibold truncate max-w-[200px]">
                {data?.person.fullName || 'Person Details'}
              </span>
            </div>
          </div>

          {/* Body States */}
          {!isHydrated || (loading && !data) ? (
            <PeopleSkeleton variant="detail" />
          ) : error ? (
            <PeopleErrorState
              message={error}
              onRetry={loadPerson}
            />
          ) : !data ? (
            <div className="bg-white border border-[#E6E2F0] rounded-2xl p-12 text-center shadow-xs">
              <h3 className="text-base font-bold text-[#17152B]">Person Not Found</h3>
              <p className="text-xs text-[#77738A] mt-1">
                The requested person could not be found in this workspace.
              </p>
              <button
                type="button"
                onClick={() => router.push('/app/people')}
                className="mt-4 px-4 py-2 bg-[#7C5CFC] text-white text-xs font-semibold rounded-xl"
              >
                Back to Directory
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Person Header */}
              <PersonDetailHeader
                fullName={data.person.fullName}
                email={data.person.email}
                phone={data.person.phone}
                organization={data.person.organization}
                jobTitle={data.person.job_title}
                onEdit={() => setIsEditModalOpen(true)}
                onOpenMobileMenu={() => setMobileMenuOpen(true)}
              />

              {/* 3 Real KPI Overview Cards */}
              <PersonOverviewCards
                eventsCount={data.stats.eventsCount}
                registrationsCount={data.stats.registrationsCount}
                checkInsCount={data.stats.checkInsCount}
                totalScansCount={data.stats.totalScansCount}
              />

              {/* Real Event Participation History */}
              <PersonEventHistory
                eventHistory={data.eventHistory}
              />
            </div>
          )}
        </main>
      </div>

      {/* Edit Person Modal */}
      {activeWorkspace?.id && data?.person && (
        <PersonModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          workspaceId={activeWorkspace.id}
          initialData={{
            id: data.person.id,
            first_name: data.person.first_name,
            last_name: data.person.last_name,
            email: data.person.email,
            phone: data.person.phone,
            organization: data.person.organization,
            job_title: data.person.job_title,
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
