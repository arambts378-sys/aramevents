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
      label: 'Total Events Hosted',
      value: totalEvents.toLocaleString(),
      icon: 'event',
      gradient: 'from-[#6366F1] to-ds-accent',
      iconBg: 'bg-[#6366F1]/10',
      iconColor: 'text-[#6366F1]',
      borderColor: 'hover:border-[#6366F1]/40',
      subtext: 'Across selected scope',
    },
    {
      label: 'Registered Attendees',
      value: totalRegistrations.toLocaleString(),
      icon: 'how_to_reg',
      gradient: 'from-[#0284C7] to-[#0EA5E9]',
      iconBg: 'bg-[#0284C7]/10',
      iconColor: 'text-[#0284C7]',
      borderColor: 'hover:border-[#0284C7]/40',
      subtext: 'Confirmed event registrations',
    },
    {
      label: 'Validated Check-ins',
      value: totalCheckIns.toLocaleString(),
      icon: 'verified',
      gradient: 'from-[#10B981] to-[#059669]',
      iconBg: 'bg-[#10B981]/10',
      iconColor: 'text-[#10B981]',
      borderColor: 'hover:border-[#10B981]/40',
      subtext: 'Unique attendees verified at gates',
    },
    {
      label: 'Overall Attendance Rate',
      value: attendanceRate !== null ? `${attendanceRate}%` : '—',
      icon: 'insights',
      gradient: 'from-[#F59E0B] to-[#EA580C]',
      iconBg: 'bg-[#F59E0B]/10',
      iconColor: 'text-[#F59E0B]',
      borderColor: 'hover:border-[#F59E0B]/40',
      subtext:
        attendanceRate !== null
          ? 'Check-ins / total registrations'
          : 'Pending registration records',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white border border-ds-line rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md ${card.borderColor} group`}
        >
          {/* Vibrant top accent border on hover */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ds-muted uppercase tracking-wider">
              {card.label}
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-200 ${card.iconBg} ${card.iconColor}`}
            >
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-ds-ink tracking-tight">
              {card.value}
            </div>
            <p className="text-[11px] text-ds-muted mt-1.5 font-normal leading-relaxed">
              {card.subtext}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
