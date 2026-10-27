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
    <div className="h-full bg-ds-subtle text-ds-ink antialiased min-h-screen w-full relative overflow-x-clip">

      <div className="min-h-screen flex flex-row w-full relative z-10">
        {/* Left Persistent Sidebar */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Workspace */}
        <main className="flex-1 min-w-0 min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 overflow-y-auto w-full">
          {/* Workspace Header */}
          <WorkspaceHeader
            currentUser={currentUser}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Workspace Suspension Notice */}
          {activeWorkspace?.is_suspended && (
            <div
              className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5]/60 text-[#991B1B] flex items-start gap-3 shadow-xs animate-in fade-in"
              role="alert"
            >
              <span className="material-symbols-outlined text-[22px] text-ds-danger shrink-0 mt-0.5">
                pause_circle
              </span>
              <div className="flex-1 text-xs">
                <p className="font-bold text-sm">Workspace Suspended by Platform Administration</p>
                <p className="mt-1 leading-relaxed text-[#7F1D1D]">
                  {activeWorkspace.suspended_reason ||
                    'This workspace is currently under administrative suspension. Event creation and public registrations are restricted.'}
                </p>
                <p className="mt-2 text-[11px] font-medium text-[#991B1B]">
                  Your data and events remain preserved. For inquiries or appeal, please contact platform administration.
                </p>
              </div>
            </div>
          )}

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
