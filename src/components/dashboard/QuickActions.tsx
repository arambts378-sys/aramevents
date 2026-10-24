import React from 'react';
import Link from 'next/link';

export function QuickActions() {
  const actions = [
    {
      title: 'Create with AI',
      description: 'Upload flyer, done',
      href: '/app/agent',
      icon: 'smart_toy',
      iconBg: 'bg-gradient-to-br from-[#7C5CFC]/15 to-[#6366F1]/15 text-[#7C5CFC]',
      borderHover: 'hover:border-[#7C5CFC]/50',
      badgeHover: 'group-hover:bg-gradient-to-br group-hover:from-[#7C5CFC] group-hover:to-[#6366F1] group-hover:text-white',
      badge: 'NEW',
    },
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

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {actions.map((action, idx) => (
          <Link
            key={idx}
            href={action.href}
            className={`bg-white border rounded-xl p-3.5 flex items-center gap-3 transition-all text-left group shadow-xs hover:shadow-sm ${action.borderHover} ${
              'badge' in action && action.badge
                ? 'border-[#7C5CFC]/25 ring-1 ring-[#7C5CFC]/10'
                : 'border-[#E6E2F0]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-xs ${action.iconBg} ${action.badgeHover}`}
            >
              <span className="material-symbols-outlined text-[19px]">
                {action.icon}
              </span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold text-[#17152B] leading-tight font-jakarta truncate transition-colors ${'badge' in action && action.badge ? 'group-hover:text-[#7C5CFC]' : 'group-hover:text-[#6366F1]'}`}>
                  {action.title}
                </span>
                {'badge' in action && action.badge && (
                  <span className="text-[8px] font-bold bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] text-white rounded-full px-1.5 py-0.5 leading-none shrink-0">
                    {action.badge}
                  </span>
                )}
              </div>
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

