'use client';

import React from 'react';

interface AnalyticsOverviewProps {
  totalEvents: number;
  totalRegistrations: number;
  totalCheckIns: number;
  attendanceRate: number | null;
}

export function AnalyticsOverview({
  totalEvents,
  totalRegistrations,
  totalCheckIns,
  attendanceRate,
}: AnalyticsOverviewProps) {
  const cards = [
    {
      label: 'Total Events',
      value: totalEvents.toLocaleString(),
      icon: 'event',
      iconBg: 'bg-[#7C5CFC]/10',
      iconColor: 'text-[#7C5CFC]',
      subtext: 'In selected scope',
    },
    {
      label: 'Total Registrations',
      value: totalRegistrations.toLocaleString(),
      icon: 'how_to_reg',
      iconBg: 'bg-[#7C5CFC]/10',
      iconColor: 'text-[#7C5CFC]',
      subtext: 'Eligible registrations recorded',
    },
    {
      label: 'Total Check-ins',
      value: totalCheckIns.toLocaleString(),
      icon: 'check_circle',
      iconBg: 'bg-[#22C55E]/10',
      iconColor: 'text-[#22C55E]',
      subtext: 'Unique allowed attendees',
    },
    {
      label: 'Attendance Rate',
      value: attendanceRate !== null ? `${attendanceRate}%` : '—',
      icon: 'insights',
      iconBg: 'bg-[#7C5CFC]/10',
      iconColor: 'text-[#7C5CFC]',
      subtext:
        attendanceRate !== null
          ? 'Check-ins / registrations'
          : 'No registrations to calculate',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#7C5CFC]/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#77738A] uppercase tracking-wider">
              {card.label}
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
            >
              <span className="material-symbols-outlined text-lg">{card.icon}</span>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#17152B] tracking-tight">
              {card.value}
            </div>
            <p className="text-[11px] text-[#77738A] mt-1 font-normal">{card.subtext}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
