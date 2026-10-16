'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mobileOpen) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLElement>('[data-sidebar-close], a')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !sidebarRef.current) return;

      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [mobileOpen]);

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
        ref={sidebarRef}
        id="workspace-navigation"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? 'Workspace navigation' : undefined}
        className={`w-[min(18rem,calc(100vw-2rem))] ${
          collapsed ? 'md:w-[76px]' : 'md:w-[230px]'
        } shrink-0 bg-white border-r border-[#E6E2F0] flex flex-col justify-between h-dvh max-h-dvh fixed md:sticky top-0 z-50 md:z-40 select-none transition-all duration-200 ease-in-out overscroll-y-contain pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          mobileOpen ? 'translate-x-0 visible' : '-translate-x-full invisible md:translate-x-0 md:visible'
        }`}
      >
        <div className={`flex flex-col ${collapsed ? 'p-3' : 'p-5'}`}>
          {/* Brand Header */}
          <div className="pb-6 border-b border-[#E6E2F0]">
            <div className="flex items-center justify-between">
              <Link href="/app" className="flex min-w-0 items-center gap-2.5 group" onClick={onClose}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-all">
                  <span className="material-symbols-outlined text-[20px]" data-icon="deployed_code">
                    deployed_code
                  </span>
                </div>
                <div className={`items-center gap-1.5 ${collapsed ? 'hidden' : 'flex'}`}>
                  <span className="font-space font-bold text-[#17152B] tracking-tight text-[16px]">
                    ARAM BTS
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                </div>
              </Link>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  data-sidebar-close
                  className="md:hidden min-h-11 min-w-11 text-[#77738A] hover:text-[#17152B] p-2 rounded-md"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>
            <div className={`text-[#77738A] text-[10px] tracking-wider uppercase font-semibold mt-1.5 pl-0.5 ${
              collapsed ? 'hidden' : 'block'
            }`}>
              EVENT OPERATING SYSTEM
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expand workspace sidebar' : 'Collapse workspace sidebar'}
              aria-expanded={!collapsed}
              className="mt-3 hidden min-h-10 w-full items-center justify-center rounded-lg text-[#77738A] hover:bg-[#F6F1FF] hover:text-[#17152B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] md:flex"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                {collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
              </span>
              <span className={collapsed ? 'sr-only' : 'ml-2 text-xs font-semibold'}>
                Collapse sidebar
              </span>
            </button>
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
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.name : undefined}
                  className={`flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all ${
                    isActive
                      ? 'bg-[#F6F1FF] text-[#7C5CFC] font-semibold'
                      : 'text-[#77738A] hover:text-[#17152B] hover:bg-[#F6F1FF]/60 font-medium'
                  } ${collapsed ? 'md:justify-center md:px-1' : ''}`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'text-[#7C5CFC]' : 'text-[#77738A]'
                    }`}
                    data-icon={item.icon}
                  >
                    {item.icon}
                  </span>
                  <span className={collapsed ? 'md:sr-only' : ''}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Block */}
        <div className={`border-t border-[#E6E2F0] flex flex-col gap-3 bg-white ${
          collapsed ? 'p-3' : 'p-4'
        }`}>
          <Link
            href="/app/profile"
            onClick={onClose}
            title={collapsed ? displayName : undefined}
            className={`flex items-center gap-3 hover:bg-[#F6F1FF]/50 p-1.5 rounded-lg transition-colors ${
              collapsed ? 'md:justify-center' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1]/15 to-[#8B5CF6]/15 text-[#6366F1] flex items-center justify-center font-bold text-[14px] border border-[#6366F1]/20 shrink-0">
              {initials}
            </div>
            <div className={`flex-col min-w-0 flex-1 ${collapsed ? 'hidden' : 'flex'}`}>
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
            title="Sign out of your account"
            className={`flex min-h-11 items-center gap-2 px-2 py-1.5 text-[#77738A] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 rounded-md text-[13px] font-medium transition-colors text-left w-full cursor-pointer disabled:opacity-50 ${
              collapsed ? 'md:justify-center' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="logout">
              logout
            </span>
            <span className={collapsed ? 'md:sr-only' : ''}>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
