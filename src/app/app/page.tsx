'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { WorkspaceHeader } from '@/components/dashboard/WorkspaceHeader';
import { KpiOverview } from '@/components/dashboard/KpiOverview';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AllEventsTable } from '@/components/dashboard/AllEventsTable';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export default function DashboardPage() {
  const { events, currentUser, activeWorkspace, isHydrated } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [totalRegistrations, setTotalRegistrations] = useState<number>(0);
  const [teamMembersCount, setTeamMembersCount] = useState<number>(1);

  // Fetch real registration counts & team member counts
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function fetchStats() {
      try {
        // 1. Fetch team members count for active workspace
        if (activeWorkspace?.id) {
          const { count, error } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', activeWorkspace.id);

          if (!error && count !== null && isMounted) {
            setTeamMembersCount(count > 0 ? count : 1);
          }
        }

        // 2. Fetch registrations for current workspace events
        const eventIds = events.map((e) => e.id);
        if (eventIds.length > 0) {
          const { data, error } = await supabase
            .from('registrations')
            .select('id, event_id')
            .in('event_id', eventIds);

          if (!error && data && isMounted) {
            setTotalRegistrations(data.length);

            const countsMap: Record<string, number> = {};
            data.forEach((r) => {
              countsMap[r.event_id] = (countsMap[r.event_id] || 0) + 1;
            });
            setRegistrationCounts(countsMap);
          }
        } else if (isMounted) {
          setTotalRegistrations(0);
          setRegistrationCounts({});
        }
      } catch (err) {
        console.error('Failed to fetch dashboard metrics:', err);
      }
    }

    if (isHydrated) {
      fetchStats();
    }

    return () => {
      isMounted = false;
    };
  }, [events, activeWorkspace, isHydrated]);

  return (
    <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen">
      <div className="min-h-screen flex flex-row w-full max-w-[1440px] mx-auto bg-[#F7F5FF]">
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Workspace */}
        <main className="flex-1 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-8 overflow-y-auto w-full md:w-[calc(100%-230px)]">
          {/* Workspace Header */}
          <WorkspaceHeader
            currentUser={currentUser}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* KPI Overview (4 Cards) */}
          <KpiOverview
            events={events}
            registrationsCount={totalRegistrations}
            teamMembersCount={teamMembersCount}
          />

          {/* Upcoming Events */}
          <UpcomingEvents events={events} />

          {/* Quick Actions Shortcut Row */}
          <QuickActions />

          {/* Two-Column Section: Data Table + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <AllEventsTable
              events={events}
              registrationCounts={registrationCounts}
            />
            <RecentActivity events={events} />
          </div>
        </main>
      </div>
    </div>
  );
}
