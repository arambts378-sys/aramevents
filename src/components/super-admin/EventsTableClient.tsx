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
        <table className="ds-table min-w-[760px]">
          <thead>
            <tr>
              <th scope="col">Event Name</th>
              <th scope="col">Workspace</th>
              <th scope="col">Status</th>
              <th scope="col">Moderation</th>
              <th scope="col" className="text-center">Registrations</th>
              <th scope="col">Start Date</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((event) => (
              <tr key={event.id} className="hover:bg-ds-subtle transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setDetailEvent(event)}
                      className="font-bold text-sm text-ds-ink hover:text-ds-accent text-left hover:underline cursor-pointer"
                    >
                      {event.name}
                    </button>
                    <span className="text-[11px] text-ds-muted font-mono mt-0.5">
                      {event.slug}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-ds-muted font-medium block">
                    {event.workspaceName}
                  </span>
                  {event.workspaceIsSuspended && (
                    <span className="text-[10px] text-ds-danger font-bold">
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
                        ? 'bg-ds-accent-soft text-ds-accent'
                        : 'bg-[#F3F4F6] text-ds-body'
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {event.moderationStatus === 'suspended' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFDAD6] text-ds-danger">
                      <span className="w-1.5 h-1.5 rounded-full bg-ds-danger" />
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
                <td className="px-4 py-3.5 text-center font-semibold text-ds-ink tabular-nums">
                  {event.registrationCount.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-ds-muted whitespace-nowrap">
                  {event.startDate || formatDate(event.createdAt)}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailEvent(event)}
                      className="px-2.5 py-1.5 rounded-lg border border-ds-line text-xs font-semibold text-ds-muted hover:bg-ds-subtle hover:text-ds-accent transition-colors cursor-pointer"
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
                        className="px-2.5 py-1.5 rounded-lg bg-[#FFDAD6] text-ds-danger hover:bg-[#FFB4AB] text-xs font-bold transition-colors cursor-pointer"
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
