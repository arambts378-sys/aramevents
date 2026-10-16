import React from 'react';
import Link from 'next/link';
import { Event } from '@/types';

interface RecentActivityProps {
  events: Event[];
}

export function RecentActivity({ events }: RecentActivityProps) {
  // Derive real activity items using only reliable existing event timestamps
  const activities = events
    .filter((e) => e.createdAt && !isNaN(new Date(e.createdAt).getTime()))
    .slice(0, 4)
    .map((e) => {
      // Calculate relative time
      let timeText = 'Recently';
      try {
        const created = new Date(e.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

          if (diffHours < 1) {
            timeText = 'Just now';
          } else if (diffHours < 24) {
            timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          } else if (diffDays === 1) {
            timeText = 'Yesterday';
          } else if (diffDays < 7) {
            timeText = `${diffDays} days ago`;
          } else {
            timeText = created.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            });
          }
        } catch {
          timeText = 'Recently';
        }

      return {
        id: e.id,
        title: 'Event created',
        eventName: e.name,
        time: timeText,
        icon: 'add_circle',
      };
    });

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
          RECENT ACTIVITY
        </h2>
        <p className="text-[13px] text-[#77738A]">System and audit updates.</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E6E2F0] p-4 shadow-xs divide-y divide-[#E6E2F0] flex flex-col justify-between">
        {activities.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[24px] text-[#77738A] mb-1.5">
              history
            </span>
            <p className="text-[13px] text-[#77738A] italic">No recent activity yet.</p>
          </div>
        ) : (
          activities.map((item, idx) => {
            const colorThemes = [
              { bg: 'bg-[#6366F1]/10', text: 'text-[#6366F1]' },
              { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
              { bg: 'bg-[#0EA5E9]/10', text: 'text-[#0EA5E9]' },
              { bg: 'bg-[#F59E0B]/10', text: 'text-[#D97706]' },
            ];
            const theme = colorThemes[idx % colorThemes.length];

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 ${
                  idx === 0 ? 'pb-3.5 pt-1' : idx === activities.length - 1 ? 'pt-3.5 pb-1' : 'py-3.5'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${theme.bg} flex items-center justify-center ${theme.text} shrink-0 mt-0.5`}>
                  <span className="material-symbols-outlined text-[18px]" data-icon={item.icon}>
                    {item.icon}
                  </span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] text-[#17152B] leading-tight font-medium font-jakarta">
                    {item.title}
                  </span>
                  <Link
                    href={`/app/events/${item.id}`}
                    className="text-[13px] text-[#6366F1] font-semibold truncate mt-0.5 hover:underline font-jakarta"
                  >
                    {item.eventName}
                  </Link>
                  <span className="text-[11px] text-[#77738A] mt-0.5 font-jakarta">
                    {item.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
