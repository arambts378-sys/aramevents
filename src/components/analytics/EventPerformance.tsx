'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EventPerformanceRow } from '@/services/analyticsService';

interface EventPerformanceProps {
  events: EventPerformanceRow[];
}

type SortField = 'name' | 'registrations' | 'checkins' | 'attendance' | 'date';
type SortOrder = 'asc' | 'desc';

export function EventPerformance({ events }: EventPerformanceProps) {
  const [sortField, setSortField] = useState<SortField>('registrations');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'registrations') {
      comparison = a.registrationsCount - b.registrationsCount;
    } else if (sortField === 'checkins') {
      comparison = a.checkInsCount - b.checkInsCount;
    } else if (sortField === 'attendance') {
      const rateA = a.attendanceRate ?? -1;
      const rateB = b.attendanceRate ?? -1;
      comparison = rateA - rateB;
    } else if (sortField === 'date') {
      comparison = a.startDate.localeCompare(b.startDate);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="bg-white border border-ds-line rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-ds-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-ds-ink tracking-tight">
            Event Performance Portfolio
          </h2>
          <p className="text-xs text-ds-muted mt-0.5 font-normal">
            Comparative registration and validated participation rates across your workspace events.
          </p>
        </div>
        <div className="text-xs text-ds-muted font-semibold">
          Showing {events.length} event{events.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Contained Horizontal Scroll Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-ds-subtle border-b border-ds-line text-ds-muted uppercase tracking-wider font-bold">
              <th
                scope="col"
                onClick={() => handleSort('name')}
                className="py-3 px-4 sm:px-6 cursor-pointer hover:text-ds-ink transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Event</span>
                  <span className="material-symbols-outlined text-sm">
                    {sortField === 'name' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>
              <th scope="col" className="py-3 px-4 hidden md:table-cell">
                Type / Format
              </th>
              <th
                scope="col"
                onClick={() => handleSort('registrations')}
                className="py-3 px-4 text-right cursor-pointer hover:text-ds-ink transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Registrations</span>
                  <span className="material-symbols-outlined text-sm">
                    {sortField === 'registrations' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('checkins')}
                className="py-3 px-4 text-right cursor-pointer hover:text-ds-ink transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Check-ins</span>
                  <span className="material-symbols-outlined text-sm">
                    {sortField === 'checkins' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('attendance')}
                className="py-3 px-4 text-right cursor-pointer hover:text-ds-ink transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Attendance</span>
                  <span className="material-symbols-outlined text-sm">
                    {sortField === 'attendance' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>
              <th scope="col" className="py-3 px-4 sm:px-6 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ds-line">
            {sortedEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ds-muted">
                  No events found in this scope.
                </td>
              </tr>
            ) : (
              sortedEvents.map((event) => (
                <tr
                  key={event.id}
                  className="hover:bg-ds-canvas/50 transition-colors group"
                >
                  <td className="py-3.5 px-4 sm:px-6">
                    <Link
                      href={`/app/events/${event.id}`}
                      className="font-bold text-ds-ink group-hover:text-ds-accent transition-colors flex flex-col"
                    >
                      <span className="text-xs sm:text-sm">{event.name}</span>
                      <span className="text-[11px] text-ds-muted font-normal">
                        {event.startDate}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 hidden md:table-cell text-ds-muted">
                    <span className="font-semibold text-ds-ink">{event.type}</span>
                    <span className="text-[11px] block">{event.format}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#6366F1] tabular-nums">
                    {event.registrationsCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#10B981] tabular-nums">
                    {event.checkInsCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {event.attendanceRate !== null ? (
                      <span
                        className={`font-bold tabular-nums px-2.5 py-0.5 rounded-full text-[11px] inline-block ${
                          event.attendanceRate >= 70
                            ? 'bg-[#10B981]/15 text-[#059669]'
                            : event.attendanceRate >= 40
                            ? 'bg-[#6366F1]/15 text-[#4F46E5]'
                            : 'bg-[#F59E0B]/15 text-[#D97706]'
                        }`}
                      >
                        {event.attendanceRate}%
                      </span>
                    ) : (
                      <span className="text-ds-muted font-bold">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        event.status.toLowerCase() === 'published'
                          ? 'bg-[#10B981]/10 text-[#059669]'
                          : event.status.toLowerCase() === 'draft'
                          ? 'bg-ds-muted/10 text-ds-muted'
                          : 'bg-[#6366F1]/10 text-[#4F46E5]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          event.status.toLowerCase() === 'published'
                            ? 'bg-[#10B981]'
                            : event.status.toLowerCase() === 'draft'
                            ? 'bg-ds-muted'
                            : 'bg-[#6366F1]'
                        }`}
                      />
                      {event.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
