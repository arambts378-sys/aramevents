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
          className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-[#77738A] uppercase tracking-wider">
              {card.label}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7C5CFC]/10 text-[#7C5CFC] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#17152B] tracking-tight">
              {card.value}
            </div>
            <p className="text-[11px] font-medium text-[#77738A] mt-1">
              {card.subtext}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
