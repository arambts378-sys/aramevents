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
      if (days === 0) return 'Next event is today';
      if (days === 1) return 'Next event is tomorrow';
      return `Next event in ${days} days`;
    }
    return `${upcomingCount} event${upcomingCount > 1 ? 's' : ''} in portfolio`;
  };

  // 2. Active events count
  const activeCount = events.filter(
    (e) => e.status === 'published'
  ).length;

  const kpiCards = [
    {
      label: 'Upcoming Events',
      value: upcomingCount,
      subtext: getNextEventSubtext(),
      icon: 'calendar_today',
      gradient: 'from-[#7C5CFC] to-[#6366F1]',
      iconBg: 'bg-[#7C5CFC]/12',
      iconColor: 'text-[#7C5CFC]',
      dotColor: upcomingCount > 0 ? 'bg-[#7C5CFC]' : 'bg-[#E6E2F0]',
      accentBorder: 'hover:border-[#7C5CFC]/40',
      glowClass: 'hover:shadow-[#7C5CFC]/8',
    },
    {
      label: 'Live Events',
      value: activeCount,
      subtext: activeCount > 0 ? `${activeCount} running right now` : 'No events live currently',
      icon: 'sensors',
      gradient: 'from-[#10B981] to-[#06B6D4]',
      iconBg: 'bg-[#10B981]/12',
      iconColor: 'text-[#10B981]',
      dotColor: activeCount > 0 ? 'bg-[#10B981]' : 'bg-[#E6E2F0]',
      accentBorder: 'hover:border-[#10B981]/40',
      glowClass: 'hover:shadow-[#10B981]/8',
    },
    {
      label: 'Total Registrations',
      value: registrationsCount.toLocaleString(),
      subtext: 'Across all active events',
      icon: 'how_to_reg',
      gradient: 'from-[#F59E0B] to-[#F97316]',
      iconBg: 'bg-[#F59E0B]/12',
      iconColor: 'text-[#F59E0B]',
      dotColor: registrationsCount > 0 ? 'bg-[#F59E0B]' : 'bg-[#E6E2F0]',
      accentBorder: 'hover:border-[#F59E0B]/40',
      glowClass: 'hover:shadow-[#F59E0B]/8',
    },
    {
      label: 'Team Members',
      value: teamMembersCount,
      subtext: teamMembersCount > 1 ? `${teamMembersCount} collaborators` : 'Workspace admin',
      icon: 'group',
      gradient: 'from-[#F43F5E] to-[#D946EF]',
      iconBg: 'bg-[#F43F5E]/12',
      iconColor: 'text-[#F43F5E]',
      dotColor: 'bg-[#F43F5E]',
      accentBorder: 'hover:border-[#F43F5E]/40',
      glowClass: 'hover:shadow-[#F43F5E]/8',
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((card, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl border border-[#E6E2F0] p-5 shadow-xs flex flex-col justify-between ${card.accentBorder} hover:shadow-lg ${card.glowClass} transition-all duration-300 group relative overflow-hidden`}
        >
          {/* Subtle gradient accent strip at top */}
          <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
              {card.label}
            </span>
            <span className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center ${card.iconColor} group-hover:scale-110 transition-transform duration-200`}>
              <span className="material-symbols-outlined text-[17px]" data-icon={card.icon}>
                {card.icon}
              </span>
            </span>
          </div>
          <div>
            <div className="text-[36px] font-bold text-[#17152B] leading-none font-space">
              {card.value}
            </div>
            <div className="text-[12px] text-[#77738A] mt-2 flex items-center gap-1.5 font-jakarta">
              <span
                className={`w-1.5 h-1.5 rounded-full ${card.dotColor}`}
              ></span>
              {card.subtext}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
