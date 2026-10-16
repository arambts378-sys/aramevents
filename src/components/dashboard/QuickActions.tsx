import React from 'react';
import Link from 'next/link';

export function QuickActions() {
  const actions = [
    {
      title: 'Create Event',
      description: 'Launch new experience',
      href: '/app/events/new',
      icon: 'add_circle',
      iconBg: 'bg-[#6366F1]/10 text-[#6366F1]',
      borderHover: 'hover:border-[#6366F1]/40',
      badgeHover: 'group-hover:bg-[#6366F1] group-hover:text-white',
    },
    {
      title: 'Event Directory',
      description: 'Manage & configure',
      href: '/app/events',
      icon: 'event_note',
      iconBg: 'bg-[#0284C7]/10 text-[#0284C7]',
      borderHover: 'hover:border-[#0284C7]/40',
      badgeHover: 'group-hover:bg-[#0284C7] group-hover:text-white',
    },
    {
      title: 'Team & People',
      description: 'Staff & attendee roles',
      href: '/app/people',
      icon: 'group',
      iconBg: 'bg-[#F59E0B]/10 text-[#D97706]',
      borderHover: 'hover:border-[#F59E0B]/40',
      badgeHover: 'group-hover:bg-[#F59E0B] group-hover:text-white',
    },
    {
      title: 'Analytics & Insights',
      description: 'Real-time metrics',
      href: '/app/analytics',
      icon: 'insights',
      iconBg: 'bg-[#10B981]/10 text-[#059669]',
      borderHover: 'hover:border-[#10B981]/40',
      badgeHover: 'group-hover:bg-[#10B981] group-hover:text-white',
    },
  ];

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#77738A]">
          QUICK ACTIONS
        </h2>
        <span className="text-[11px] text-[#77738A] font-medium hidden sm:inline">
          Workspace shortcuts
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action, idx) => (
          <Link
            key={idx}
            href={action.href}
            className={`bg-white border border-[#E6E2F0] rounded-xl p-3.5 flex items-center gap-3 transition-all text-left group shadow-xs hover:shadow-sm ${action.borderHover}`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-xs ${action.iconBg} ${action.badgeHover}`}
            >
              <span className="material-symbols-outlined text-[19px]">
                {action.icon}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-[#17152B] leading-tight font-jakarta truncate group-hover:text-[#6366F1] transition-colors">
                {action.title}
              </span>
              <span className="text-[10px] text-[#77738A] mt-0.5 truncate font-normal">
                {action.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
