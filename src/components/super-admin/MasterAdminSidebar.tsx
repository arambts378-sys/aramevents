'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface MasterAdminSidebarProps {
  adminEmail: string;
}

const navItems = [
  { href: '/super-admin', label: 'Overview', icon: 'dashboard', exact: true },
  { href: '/super-admin/organizers', label: 'Organizers', icon: 'corporate_fare', exact: false },
  { href: '/super-admin/events', label: 'Global Events', icon: 'calendar_month', exact: false },
  { href: '/super-admin/analytics', label: 'Analytics', icon: 'monitoring', exact: false },
  { href: '/super-admin/activity', label: 'Activity Feed', icon: 'history', exact: false },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: 'security', exact: false },
];

export function MasterAdminSidebar({ adminEmail }: MasterAdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/super-admin/login');
      router.refresh();
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white/90 backdrop-blur border-b border-ds-line px-4 py-2.5 shrink-0">
        <Link href="/super-admin" className="flex items-center">
          <Image src="/aram-logo.png" alt="Aram" width={1382} height={418} priority className="h-6 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ds-muted hover:bg-ds-subtle hover:text-ds-ink"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`w-[min(17rem,calc(100vw-2rem))] md:w-60 xl:w-64 shrink-0 bg-ds-subtle border-r border-ds-line flex flex-col justify-between h-dvh max-h-dvh fixed md:sticky top-0 z-50 md:z-40 select-none transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3 flex flex-col min-h-0 flex-1">
          {/* Header */}
          <div className="px-1 pb-3">
            <div className="flex h-10 items-center justify-between">
              <Link href="/super-admin" className="flex items-center rounded-lg px-1.5 py-1">
                <Image src="/aram-logo.png" alt="Aram" width={1382} height={418} priority className="h-6 w-auto" />
              </Link>
              {mobileOpen && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="md:hidden text-ds-muted p-1.5"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-0.5 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-9 items-center gap-2.5 px-2.5 rounded-lg text-[14px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ds-accent ${
                    isActive
                      ? 'bg-ds-ink/[0.06] text-ds-ink font-medium'
                      : 'text-ds-body hover:text-ds-ink hover:bg-ds-ink/[0.04]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[19px] ${
                      isActive ? 'text-ds-ink' : 'text-ds-muted'
                    }`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile & Logout */}
        <div className="p-3 border-t border-ds-line flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5 p-1.5">
            <div className="w-8 h-8 rounded-full bg-ds-ink text-white flex items-center justify-center font-medium text-[12px] shrink-0">
              {adminEmail.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-medium text-ds-ink truncate block leading-tight">
                {adminEmail}
              </span>
              <span className="text-[11px] text-ds-muted block">Platform administrator</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex min-h-9 items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-ds-muted hover:text-ds-danger hover:bg-ds-ink/[0.04] rounded-lg transition-colors w-full cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{loggingOut ? 'Signing out…' : 'Sign Out of Admin'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
