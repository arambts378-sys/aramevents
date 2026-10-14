'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Event } from '@/types';

interface UpcomingEventsProps {
  events: Event[];
}

function EventImageWithFallback({
  src,
  alt,
  format,
  name,
}: {
  src?: string | null;
  alt: string;
  format?: string;
  name: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#F6F1FF] via-[#EDE9FE] to-[#F0EBFF] flex flex-col items-center justify-center p-4 relative group-hover:scale-105 transition-transform duration-300">
        <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#7C5CFC] mb-2 border border-[#E6E2F0]">
          <span className="material-symbols-outlined text-[24px]">event</span>
        </div>
        <span className="text-[12px] font-bold text-[#7C5CFC] tracking-wider uppercase font-space">
          {format || 'ARAM BTS'}
        </span>
        <span className="text-[10px] text-[#77738A] truncate max-w-[160px] text-center mt-0.5">
          {name}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImageError(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  // Filter for upcoming / non-archived events (take up to 3)
  const upcomingEvents = events.filter((e) => e.status !== 'archived').slice(0, 3);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Date TBA';
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
    <section className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[#17152B] tracking-tight font-space">
            Upcoming events
          </h2>
          <p className="text-[13px] text-[#77738A] font-jakarta">See what's happening next.</p>
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

      {upcomingEvents.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-[#E6E2F0] p-10 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[24px]">calendar_today</span>
          </div>
          <h3 className="text-[16px] font-bold text-[#17152B] font-space mb-1">
            No upcoming events yet.
          </h3>
          <p className="text-[13px] text-[#77738A] mb-5 font-jakarta">
            Create your first event to get started.
          </p>
          <Link
            href="/app/events/new"
            className="h-[40px] px-5 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white text-[13px] font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Event</span>
          </Link>
        </div>
      ) : (
        /* Grid of Event Cards */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {upcomingEvents.map((event) => {
            const isDraft = event.status === 'draft' || !event.status;
            const isPublished = event.status === 'published';

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-[#E6E2F0] overflow-hidden shadow-xs hover:shadow-md hover:border-[#7C5CFC]/40 transition-all flex flex-col group"
              >
                {/* Image Section */}
                <div className="relative aspect-video w-full overflow-hidden bg-[#F6F1FF]">
                  <EventImageWithFallback
                    src={event.flyer}
                    alt={event.name}
                    format={event.format || event.type}
                    name={event.name}
                  />
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    {isDraft ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-[#E6E2F0] text-[11px] text-[#77738A] uppercase font-bold tracking-wider">
                        Draft
                      </span>
                    ) : isPublished ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#7C5CFC] text-white text-[11px] uppercase font-bold tracking-wider shadow-xs">
                        Upcoming
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#16A34A] text-[11px] uppercase font-bold tracking-wider">
                        {event.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <Link
                      href={`/app/events/${event.id}`}
                      className="text-[18px] font-bold text-[#17152B] group-hover:text-[#7C5CFC] transition-colors line-clamp-1 font-space block"
                    >
                      {event.name}
                    </Link>
                    <div className="mt-2.5 flex items-center gap-2 text-[13px] text-[#77738A] font-jakarta">
                      <span
                        className="material-symbols-outlined text-[16px] text-[#77738A] shrink-0"
                        data-icon="schedule"
                      >
                        schedule
                      </span>
                      <span className="truncate">
                        {formatDate(event.startDate)} {event.location ? `· ${event.location}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-[#E6E2F0] flex items-center justify-between">
                    <span className="text-[11px] text-[#77738A] uppercase font-semibold">
                      {event.type || event.format || 'Event'}
                    </span>
                    <Link
                      href={`/app/events/${event.id}`}
                      className="h-[36px] px-3.5 rounded-lg bg-[#F6F1FF] text-[#7C5CFC] hover:bg-[#7C5CFC] hover:text-white text-[13px] font-bold group-hover:shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <span>Open Event</span>
                      <span
                        className="material-symbols-outlined text-[15px]"
                        data-icon="arrow_forward"
                      >
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
