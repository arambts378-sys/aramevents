'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import {
  fetchAnalyticsData,
  AnalyticsData,
  DateRangePreset,
} from '@/services/analyticsService';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview';
import { RegistrationAttendanceChart } from '@/components/analytics/RegistrationAttendanceChart';
import { RegistrationBreakdown } from '@/components/analytics/RegistrationBreakdown';
import { EventPerformance } from '@/components/analytics/EventPerformance';
import { OperationalInsights } from '@/components/analytics/OperationalInsights';
import { AnalyticsSkeleton } from '@/components/analytics/AnalyticsSkeleton';
import { AnalyticsEmptyState } from '@/components/analytics/AnalyticsEmptyState';
import { AnalyticsErrorState } from '@/components/analytics/AnalyticsErrorState';

export default function AnalyticsPage() {
  const { currentUser, activeWorkspace, events, isHydrated } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');

  // Default custom date range: past 30 days to today
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchAnalyticsData({
        workspaceId: activeWorkspace.id,
        selectedEventId,
        dateRange,
        customStartDate: dateRange === 'custom' ? customStartDate : undefined,
        customEndDate: dateRange === 'custom' ? customEndDate : undefined,
      });

      setData(result);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.message || 'Unable to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, selectedEventId, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (isHydrated && activeWorkspace?.id) {
      loadData();
    }
  }, [isHydrated, activeWorkspace?.id, loadData]);

  const handleResetFilters = () => {
    setSelectedEventId('all');
    setDateRange('30d');
  };

  return (
    <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-[#F7F5FF]">
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Workspace */}
        <main className="flex-1 min-w-0 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 overflow-y-auto w-full">
          {/* Top Breadcrumb & Mobile Menu Toggle */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5 text-xs text-[#77738A]">
              <Link href="/app" className="hover:text-[#17152B] transition-colors">
                Home
              </Link>
              <span>&gt;</span>
              <span className="text-[#17152B] font-semibold">Analytics</span>
            </div>
          </div>

          {/* Analytics Header with Title & Interactive Filters */}
          <AnalyticsHeader
            events={events.map((e) => ({ id: e.id, name: e.name }))}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            dateRange={dateRange}
            onSelectDateRange={setDateRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onChangeCustomDates={(start, end) => {
              setCustomStartDate(start);
              setCustomEndDate(end);
            }}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Main Body States */}
          {!isHydrated || (loading && !data) ? (
            <AnalyticsSkeleton />
          ) : error ? (
            <AnalyticsErrorState message={error} onRetry={loadData} />
          ) : !data || !data.hasEvents ? (
            <AnalyticsEmptyState type="no-events" />
          ) : !data.hasData ? (
            <div className="flex flex-col gap-6">
              <AnalyticsOverview
                totalEvents={data.overview.totalEvents}
                totalRegistrations={data.overview.totalRegistrations}
                totalCheckIns={data.overview.totalCheckIns}
                attendanceRate={data.overview.attendanceRate}
              />
              <AnalyticsEmptyState
                type="no-records"
                onResetFilters={handleResetFilters}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* 4 Primary KPI Cards */}
              <AnalyticsOverview
                totalEvents={data.overview.totalEvents}
                totalRegistrations={data.overview.totalRegistrations}
                totalCheckIns={data.overview.totalCheckIns}
                attendanceRate={data.overview.attendanceRate}
              />

              {/* Main SVG Trend Chart */}
              <RegistrationAttendanceChart trend={data.trend} />

              {/* Distribution & Breakdown Cards */}
              <RegistrationBreakdown
                eventType={data.breakdowns.eventType}
                registrationStatus={data.breakdowns.registrationStatus}
                walkathonDistance={data.breakdowns.walkathonDistance}
              />

              {/* Event Performance Portfolio */}
              <EventPerformance events={data.eventPerformance} />

              {/* Operational & Scanner Insights (if scans exist) */}
              <OperationalInsights operational={data.operational} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
