'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentUser, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const navItems = [
    { name: 'Home', path: '/app', icon: 'home', exact: true },
    { name: 'Events', path: '/app/events', icon: 'calendar_today', exact: false },
    { name: 'People', path: '/app/people', icon: 'group', exact: false },
    { name: 'Analytics', path: '/app/analytics', icon: 'bar_chart', exact: false },
    { name: 'Settings', path: '/app/settings', icon: 'settings', exact: false },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'ME';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(currentUser?.name);
  const displayName = currentUser?.name || 'Workspace User';
  const displayRole = currentUser?.email ? currentUser.email : 'Event Manager';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`w-[230px] shrink-0 bg-white border-r border-[#E6E2F0] flex flex-col justify-between h-screen fixed md:sticky top-0 z-50 md:z-40 select-none transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col p-5">
          {/* Brand Header */}
          <div className="pb-6 border-b border-[#E6E2F0]">
            <div className="flex items-center justify-between">
              <Link href="/app" className="flex items-center gap-2.5 group" onClick={onClose}>
                <div className="w-8 h-8 rounded-lg bg-[#7C5CFC] flex items-center justify-center text-white shadow-xs group-hover:bg-[#5B3FE8] transition-colors">
                  <span className="material-symbols-outlined text-[20px]" data-icon="deployed_code">
                    deployed_code
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-space font-bold text-[#17152B] tracking-tight text-[16px]">
                    ARAM BTS
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#7C5CFC]"></span>
                </div>
              </Link>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="md:hidden text-[#77738A] hover:text-[#17152B] p-1 rounded-md"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>
            <div className="text-[#77738A] text-[10px] tracking-wider uppercase font-semibold mt-1.5 pl-0.5">
              EVENT OPERATING SYSTEM
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 mt-5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.path
                : pathname === item.path || pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all ${
                    isActive
                      ? 'bg-[#F6F1FF] text-[#7C5CFC] font-semibold'
                      : 'text-[#77738A] hover:text-[#17152B] hover:bg-[#F6F1FF]/60 font-medium'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'text-[#7C5CFC]' : 'text-[#77738A]'
                    }`}
                    data-icon={item.icon}
                  >
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Block */}
        <div className="p-4 border-t border-[#E6E2F0] flex flex-col gap-3 bg-white">
          <Link
            href="/app/profile"
            onClick={onClose}
            className="flex items-center gap-3 hover:bg-[#F6F1FF]/50 p-1.5 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center font-bold text-[14px] border border-[#E6E2F0] shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[14px] font-bold text-[#17152B] truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[12px] text-[#77738A] truncate">
                {displayRole}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-2 py-1.5 text-[#77738A] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 rounded-md text-[13px] font-medium transition-colors text-left w-full cursor-pointer disabled:opacity-50"
            title="Sign out of your account"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="logout">
              logout
            </span>
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
