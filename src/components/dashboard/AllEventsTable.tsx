import React from 'react';
import Link from 'next/link';
import { Event } from '@/types';

interface AllEventsTableProps {
  events: Event[];
  registrationCounts?: Record<string, number>;
}

export function AllEventsTable({ events, registrationCounts = {} }: AllEventsTableProps) {
  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBA';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="lg:col-span-2 flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[#17152B] tracking-tight font-space">
            All events
          </h2>
          <p className="text-[13px] text-[#77738A] font-jakarta">
            Manage every event from one place.
          </p>
        </div>
        <Link
          href="/app/events"
          className="text-[13px] font-semibold text-[#7C5CFC] hover:text-[#5B3FE8] flex items-center gap-1 group transition-colors"
        >
          <span>View all events</span>
          <span
            className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform"
            data-icon="arrow_forward"
          >
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#E6E2F0] overflow-hidden shadow-xs">
        {events.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-[#77738A] mb-2">
              event_busy
            </span>
            <p className="text-[14px] font-semibold text-[#17152B] font-space">
              No events found.
            </p>
            <p className="text-[13px] text-[#77738A] mt-1 mb-4 font-jakarta">
              Create your first event to get started.
            </p>
            <Link
              href="/app/events/new"
              className="h-[36px] px-4 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-[13px] font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Create Event</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F6F1FF]/60 border-b border-[#E6E2F0]">
                    <th className="py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
                      EVENT
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
                      DATE
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
                      TYPE
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
                      STATUS
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#77738A] text-right">
                      REGISTRATIONS
                    </th>
                    <th className="py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-[#77738A] text-right">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2F0] text-[13px] font-jakarta">
                  {events.map((event) => {
                    const regCount = registrationCounts[event.id] || 0;
                    const isDraft = event.status === 'draft' || !event.status;
                    const isPublished = event.status === 'published';

                    return (
                      <tr
                        key={event.id}
                        className="hover:bg-[#F6F1FF]/40 transition-colors group"
                      >
                        {/* Event Name */}
                        <td className="py-3.5 px-5 font-semibold text-[#17152B] group-hover:text-[#7C5CFC] transition-colors">
                          <Link href={`/app/events/${event.id}`} className="hover:underline">
                            {event.name}
                          </Link>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-[#77738A]">
                          {formatDate(event.startDate)}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 text-[#77738A]">
                          {event.type || event.format || 'Event'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#6B7280] border border-[#E6E2F0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
                              Draft
                            </span>
                          ) : isPublished ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6366F1]/10 text-[#4F46E5] border border-[#6366F1]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                              {event.status}
                            </span>
                          )}
                        </td>

                        {/* Registrations */}
                        <td className="py-3.5 px-4 text-right font-space font-bold text-[#6366F1]">
                          {regCount.toLocaleString()}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            href={`/app/events/${event.id}`}
                            className="text-[12px] font-bold text-[#6366F1] bg-[#6366F1]/10 hover:bg-[#6366F1] hover:text-white px-2.5 py-1 rounded-md transition-colors inline-flex items-center gap-0.5"
                          >
                            <span>Manage</span>
                            <span
                              className="material-symbols-outlined text-[14px]"
                              data-icon="chevron_right"
                            >
                              chevron_right
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact Cards View (under md breakpoint, zero horizontal scroll) */}
            <div className="md:hidden divide-y divide-[#E6E2F0]">
              {events.map((event) => {
                const regCount = registrationCounts[event.id] || 0;
                const isDraft = event.status === 'draft' || !event.status;
                const isPublished = event.status === 'published';

                return (
                  <div
                    key={event.id}
                    className="p-4 flex flex-col gap-2.5 hover:bg-[#F6F1FF]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/app/events/${event.id}`}
                        className="font-semibold text-[#17152B] hover:text-[#6366F1] text-[14px] leading-snug line-clamp-2"
                      >
                        {event.name}
                      </Link>
                      {isDraft ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#6B7280] border border-[#E6E2F0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
                          Draft
                        </span>
                      ) : isPublished ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          Published
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6366F1]/10 text-[#4F46E5] border border-[#6366F1]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                          {event.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-[#77738A] font-jakarta">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(event.startDate)}</span>
                        <span>·</span>
                        <span className="font-medium text-[#17152B]">{event.type || event.format || 'Event'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-medium text-[#77738A]">Reg:</span>
                        <span className="font-space font-bold text-[#6366F1]">
                          {regCount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E6E2F0]/60 flex items-center justify-end">
                      <Link
                        href={`/app/events/${event.id}`}
                        className="text-[12px] font-bold text-[#6366F1] bg-[#6366F1]/10 hover:bg-[#6366F1] hover:text-white px-3 py-1 rounded-md transition-colors inline-flex items-center gap-0.5"
                      >
                        <span>Manage</span>
                        <span
                          className="material-symbols-outlined text-[14px]"
                          data-icon="chevron_right"
                        >
                          chevron_right
                        </span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
