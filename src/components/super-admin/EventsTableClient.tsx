'use client';

import React, { useState } from 'react';
import { EventModerationModal } from './EventModerationModal';
import { EventDetailModal } from './EventDetailModal';
import type { PlatformEventItem, EventModerationAction } from '@/lib/super-admin/types';

interface EventsTableClientProps {
  items: PlatformEventItem[];
}

export function EventsTableClient({ items }: EventsTableClientProps) {
  const [detailEvent, setDetailEvent] = useState<PlatformEventItem | null>(null);
  const [moderatingEvent, setModeratingEvent] = useState<{
    event: { id: string; name: string; status: string; moderationStatus: string };
    action: EventModerationAction;
  } | null>(null);

  const formatDate = (val: string) => {
    const d = new Date(val);
    return Number.isNaN(d.getTime())
      ? '—'
      : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(d);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8FF] text-[#77738A] font-semibold border-b border-[#E6E2F0]">
            <tr>
              <th className="px-4 py-3.5">Event Name</th>
              <th className="px-4 py-3.5">Workspace</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Moderation</th>
              <th className="px-4 py-3.5 text-center">Registrations</th>
              <th className="px-4 py-3.5">Start Date</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EDF8]">
            {items.map((event) => (
              <tr key={event.id} className="hover:bg-[#F9F7FF] transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setDetailEvent(event)}
                      className="font-bold text-sm text-[#17152B] hover:text-[#7C5CFC] text-left hover:underline cursor-pointer"
                    >
                      {event.name}
                    </button>
                    <span className="text-[11px] text-[#77738A] font-mono mt-0.5">
                      {event.slug}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[#5A566B] font-medium block">
                    {event.workspaceName}
                  </span>
                  {event.workspaceIsSuspended && (
                    <span className="text-[10px] text-[#BA1A1A] font-bold">
                      (Workspace Suspended)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      event.status === 'published'
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : event.status === 'draft'
                        ? 'bg-[#EDE9FE] text-[#7C5CFC]'
                        : 'bg-[#F3F4F6] text-[#4B5563]'
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {event.moderationStatus === 'suspended' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFDAD6] text-[#BA1A1A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A]" />
                      Suspended
                    </span>
                  ) : event.moderationStatus === 'flagged' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
                      Flagged
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                      Normal
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center font-semibold text-[#17152B] tabular-nums">
                  {event.registrationCount.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-[#77738A] whitespace-nowrap">
                  {event.startDate || formatDate(event.createdAt)}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailEvent(event)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E6E2F0] text-xs font-semibold text-[#5A566B] hover:bg-[#F6F1FF] hover:text-[#7C5CFC] transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    {event.moderationStatus !== 'suspended' ? (
                      <button
                        type="button"
                        onClick={() =>
                          setModeratingEvent({
                            event: {
                              id: event.id,
                              name: event.name,
                              status: event.status,
                              moderationStatus: event.moderationStatus,
                            },
                            action: 'suspend',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#FFDAD6] text-[#BA1A1A] hover:bg-[#FFB4AB] text-xs font-bold transition-colors cursor-pointer"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setModeratingEvent({
                            event: {
                              id: event.id,
                              name: event.name,
                              status: event.status,
                              moderationStatus: event.moderationStatus,
                            },
                            action: 'restore',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0] text-xs font-bold transition-colors cursor-pointer"
                      >
                        Restore
                      </button>
                    )}

                    {event.moderationStatus === 'normal' && (
                      <button
                        type="button"
                        onClick={() =>
                          setModeratingEvent({
                            event: {
                              id: event.id,
                              name: event.name,
                              status: event.status,
                              moderationStatus: event.moderationStatus,
                            },
                            action: 'flag',
                          })
                        }
                        className="px-2 py-1.5 rounded-lg text-[#F59E0B] hover:bg-[#FEF3C7] text-xs font-bold transition-colors cursor-pointer"
                        title="Flag for review"
                      >
                        <span className="material-symbols-outlined text-[16px]">flag</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          isOpen={!!detailEvent}
          onClose={() => setDetailEvent(null)}
        />
      )}

      {moderatingEvent && (
        <EventModerationModal
          event={moderatingEvent.event}
          action={moderatingEvent.action}
          isOpen={!!moderatingEvent}
          onClose={() => setModeratingEvent(null)}
        />
      )}
    </>
  );
}
