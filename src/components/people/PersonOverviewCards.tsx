'use client';

import React from 'react';

interface PersonOverviewCardsProps {
  eventsCount: number;
  registrationsCount: number;
  checkInsCount: number; // attended events count
  totalScansCount?: number;
}

export function PersonOverviewCards({
  eventsCount,
  registrationsCount,
  checkInsCount,
  totalScansCount = 0,
}: PersonOverviewCardsProps) {
  const cards = [
    {
      label: 'Events Connected',
      value: eventsCount,
      icon: 'event',
      subtext: eventsCount === 1 ? '1 associated event' : `${eventsCount} associated events`,
    },
    {
      label: 'Registrations',
      value: registrationsCount,
      icon: 'how_to_reg',
      subtext: registrationsCount === 1 ? '1 registration ticket' : `${registrationsCount} registration tickets`,
    },
    {
      label: 'Attended Events',
      value: checkInsCount,
      icon: 'fact_check',
      subtext:
        totalScansCount > 0
          ? `${totalScansCount} total allowed scan${totalScansCount === 1 ? '' : 's'}`
          : 'No check-in activity yet',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white border border-ds-line rounded-2xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-ds-muted uppercase tracking-wider">
              {card.label}
            </span>
            <div className="w-8 h-8 rounded-xl bg-ds-accent/10 text-ds-accent flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ds-ink tracking-tight">
              {card.value}
            </div>
            <p className="text-[11px] font-medium text-ds-muted mt-1">
              {card.subtext}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
