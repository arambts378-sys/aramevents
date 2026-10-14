import React from 'react';
import { Event } from '@/types';

interface KpiOverviewProps {
  events: Event[];
  registrationsCount?: number;
  teamMembersCount?: number;
}

export function KpiOverview({
  events,
  registrationsCount = 0,
  teamMembersCount = 1,
}: KpiOverviewProps) {
  // 1. Upcoming events count (non-archived)
  const upcomingEvents = events.filter((e) => e.status !== 'archived');
  const upcomingCount = upcomingEvents.length;

  // Calculate next event subtext strictly from real event dates
  const getNextEventSubtext = () => {
    if (upcomingEvents.length === 0) return 'No events scheduled';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const futureEvents = upcomingEvents
      .filter((e) => e.startDate)
      .map((e) => {
        let eventDate: Date;
        const parts = e.startDate.split(/[-/]/);
        if (parts.length === 3 && parts[0].length === 4) {
          eventDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          const parsed = new Date(e.startDate);
          eventDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
        const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { event: e, diffDays };
      })
      .filter((item) => item.diffDays >= 0 && !isNaN(item.diffDays))
      .sort((a, b) => a.diffDays - b.diffDays);

    if (futureEvents.length > 0) {
      const days = futureEvents[0].diffDays;
      if (days === 0) return 'Next event today';
      if (days === 1) return 'Next event tomorrow';
      return `Next event in ${days} days`;
    }
    return `${upcomingCount} event${upcomingCount > 1 ? 's' : ''} in portfolio`;
  };

  // 2. Active events count
  const activeCount = events.filter(
    (e) => e.status === 'published'
  ).length;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: UPCOMING EVENTS */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-5 shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
            UPCOMING EVENTS
          </span>
          <span className="w-7 h-7 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[16px]" data-icon="calendar_today">
              calendar_today
            </span>
          </span>
        </div>
        <div>
          <div className="text-[36px] font-bold text-[#17152B] leading-none font-space">
            {upcomingCount}
          </div>
          <div className="text-[12px] text-[#77738A] mt-2 flex items-center gap-1.5 font-jakarta">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                upcomingCount > 0 ? 'bg-[#7C5CFC]' : 'bg-[#E6E2F0]'
              }`}
            ></span>
            {getNextEventSubtext()}
          </div>
        </div>
      </div>

      {/* Card 2: ACTIVE EVENTS */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-5 shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
            ACTIVE EVENTS
          </span>
          <span className="w-7 h-7 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[16px]" data-icon="sensors">
              sensors
            </span>
          </span>
        </div>
        <div>
          <div className="text-[36px] font-bold text-[#17152B] leading-none font-space">
            {activeCount}
          </div>
          <div className="text-[12px] text-[#77738A] mt-2 flex items-center gap-1.5 font-jakarta">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeCount > 0 ? 'bg-[#22C55E]' : 'bg-[#E6E2F0]'
              }`}
            ></span>
            {activeCount > 0 ? `${activeCount} live right now` : 'All systems ready'}
          </div>
        </div>
      </div>

      {/* Card 3: REGISTRATIONS */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-5 shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
            REGISTRATIONS
          </span>
          <span className="w-7 h-7 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[16px]" data-icon="how_to_reg">
              how_to_reg
            </span>
          </span>
        </div>
        <div>
          <div className="text-[36px] font-bold text-[#17152B] leading-none font-space">
            {registrationsCount.toLocaleString()}
          </div>
          <div className="text-[12px] text-[#77738A] mt-2 flex items-center gap-1.5 font-jakarta">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                registrationsCount > 0 ? 'bg-[#7C5CFC]' : 'bg-[#E6E2F0]'
              }`}
            ></span>
            Across current cycle
          </div>
        </div>
      </div>

      {/* Card 4: TEAM MEMBERS */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] p-5 shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
            TEAM MEMBERS
          </span>
          <span className="w-7 h-7 rounded-lg bg-[#F6F1FF] flex items-center justify-center text-[#7C5CFC]">
            <span className="material-symbols-outlined text-[16px]" data-icon="badge">
              badge
            </span>
          </span>
        </div>
        <div>
          <div className="text-[36px] font-bold text-[#17152B] leading-none font-space">
            {teamMembersCount}
          </div>
          <div className="text-[12px] text-[#77738A] mt-2 flex items-center gap-1.5 font-jakarta">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC]"></span>
            {teamMembersCount > 1 ? `${teamMembersCount} collaborators` : 'Active workspace admin'}
          </div>
        </div>
      </div>
    </section>
  );
}
