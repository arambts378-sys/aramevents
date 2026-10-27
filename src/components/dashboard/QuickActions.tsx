import React from 'react';
import Link from 'next/link';

export function QuickActions() {
  const actions = [
    {
      title: 'Create with AI',
      description: 'Upload flyer, done',
      href: '/app/agent',
      icon: 'auto_awesome',
      iconBg: 'bg-ds-accent-soft text-ds-accent',
      borderHover: 'hover:border-ds-accent/50',
      badgeHover: 'group-hover:bg-ds-accent group-hover:text-white',
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
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted">
          QUICK ACTIONS
        </h2>
        <span className="text-[11px] text-ds-muted font-medium hidden sm:inline">
          Workspace shortcuts
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {actions.map((action, idx) => (
          <Link
            key={idx}
            href={action.href}
            className={`bg-white border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 text-left group shadow-xs hover:shadow-md hover:-translate-y-1 ${action.borderHover} ${
              'badge' in action && action.badge
                ? 'border-ds-accent/35 ring-1 ring-ds-accent/15 bg-white'
                : 'border-ds-line/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-2xs ${action.iconBg} ${action.badgeHover}`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {action.icon}
              </span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold text-ds-ink leading-tight font-jakarta truncate transition-colors ${'badge' in action && action.badge ? 'group-hover:text-ds-accent' : 'group-hover:text-[#6366F1]'}`}>
                  {action.title}
                </span>
                {'badge' in action && action.badge && (
                  <span className="text-[8px] font-bold bg-ds-accent text-white rounded-full px-1.5 py-0.5 leading-none shrink-0 shadow-2xs">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-ds-muted mt-0.5 truncate font-medium">
                {action.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

