'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
    { name: 'AI Event Agent', path: '/app/agent', icon: 'auto_awesome', exact: false, badge: 'New' },
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
          collapsed ? 'md:w-[76px]' : 'md:w-[236px]'
        } shrink-0 bg-ds-subtle border-r border-ds-line flex flex-col justify-between h-dvh max-h-dvh fixed md:sticky top-0 z-50 md:z-40 select-none transition-all duration-200 ease-in-out overscroll-y-contain pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          mobileOpen ? 'translate-x-0 visible' : '-translate-x-full invisible md:translate-x-0 md:visible'
        }`}
      >
        <div className="flex flex-col p-3">
          {/* Brand Header */}
          <div className="px-1 pb-3">
            <div className={`flex items-center ${collapsed ? 'h-10 justify-between md:h-auto md:flex-col md:gap-1.5' : 'h-10 justify-between'}`}>
              <Link href="/app" className={`flex min-w-0 items-center gap-2.5 rounded-lg py-1 ${collapsed ? 'px-1.5 md:px-0' : 'px-1.5'}`} onClick={onClose}>
                <Image
                  src="/aram-logo.png"
                  alt="Aram"
                  width={1382}
                  height={418}
                  priority
                  className={`h-6 w-auto ${collapsed ? 'md:hidden' : ''}`}
                />
                {collapsed && (
                  <Image
                    src="/aram-mark.png"
                    alt="Aram"
                    width={339}
                    height={418}
                    className="hidden h-6 w-auto md:block"
                  />
                )}
              </Link>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCollapsed((value) => !value)}
                  aria-label={collapsed ? 'Expand workspace sidebar' : 'Collapse workspace sidebar'}
                  aria-expanded={!collapsed}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-ds-muted hover:bg-ds-subtle hover:text-ds-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[19px]">
                    {collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
                  </span>
                </button>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    data-sidebar-close
                    className="md:hidden min-h-11 min-w-11 text-ds-muted hover:text-ds-ink p-2 rounded-md"
                    aria-label="Close menu"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-0.5">
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
                  className={`flex min-h-9 items-center gap-2.5 px-2.5 rounded-lg text-[14px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ds-accent ${
                    isActive
                      ? 'bg-ds-ink/[0.06] text-ds-ink font-medium'
                      : 'text-ds-body hover:text-ds-ink hover:bg-ds-ink/[0.04]'
                  } ${collapsed ? 'md:justify-center md:px-1' : ''}`}
                >
                  <span
                    className={`material-symbols-outlined text-[19px] ${
                      isActive ? 'text-ds-ink' : 'text-ds-muted'
                    }`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
                    data-icon={item.icon}
                  >
                    {item.icon}
                  </span>
                  <span className={`${collapsed ? 'md:sr-only' : ''} flex-1 min-w-0 truncate`}>{item.name}</span>
                  {'badge' in item && item.badge && !collapsed && (
                    <span className="text-[10px] font-medium text-ds-accent-strong bg-ds-accent-soft rounded-md px-1.5 py-0.5 leading-none shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Block */}
        <div className="border-t border-ds-line flex flex-col gap-0.5 p-3">
          <Link
            href="/app/settings#account"
            onClick={onClose}
            title={collapsed ? displayName : undefined}
            className={`flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-ds-ink/[0.04] transition-colors ${
              collapsed ? 'md:justify-center' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-ds-ink text-white flex items-center justify-center font-medium text-[12px] shrink-0">
              {initials}
            </div>
            <div className={`flex-col min-w-0 flex-1 ${collapsed ? 'hidden' : 'flex'}`}>
              <span className="text-[13px] font-medium text-ds-ink truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[11px] text-ds-muted truncate">
                {displayRole}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out of your account"
            className={`flex min-h-9 items-center gap-2.5 px-2.5 py-1.5 text-ds-muted hover:text-ds-ink hover:bg-ds-ink/[0.04] rounded-lg text-[13px] transition-colors text-left w-full cursor-pointer disabled:opacity-50 ${
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
