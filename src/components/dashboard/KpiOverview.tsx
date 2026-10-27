import React from 'react';
import { Event } from '@/types';
import { StatCard, type StatTone } from '@/components/ui';

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
      tone: 'accent' as StatTone,
      value: upcomingCount,
      subtext: getNextEventSubtext(),
      icon: 'calendar_today',
    },
    {
      label: 'Live Events',
      tone: 'success' as StatTone,
      value: activeCount,
      subtext: activeCount > 0 ? `${activeCount} running right now` : 'No events live currently',
      icon: 'sensors',
    },
    {
      label: 'Total Registrations',
      tone: 'warning' as StatTone,
      value: registrationsCount.toLocaleString(),
      subtext: 'Across all active events',
      icon: 'how_to_reg',
    },
    {
      label: 'Team Members',
      tone: 'indigo' as StatTone,
      value: teamMembersCount,
      subtext: teamMembersCount > 1 ? `${teamMembersCount} collaborators` : 'Workspace admin',
      icon: 'group',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {kpiCards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          hint={card.subtext}
          icon={card.icon}
          tone={card.tone}
        />
      ))}
    </section>
  );
}
