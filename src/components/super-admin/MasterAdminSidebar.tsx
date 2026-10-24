'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface MasterAdminSidebarProps {
  adminEmail: string;
  adminRole: string;
}

const navItems = [
  { href: '/super-admin', label: 'Overview', icon: 'dashboard', exact: true },
  { href: '/super-admin/organizers', label: 'Organizers', icon: 'corporate_fare', exact: false },
  { href: '/super-admin/events', label: 'Global Events', icon: 'calendar_month', exact: false },
  { href: '/super-admin/analytics', label: 'Analytics', icon: 'monitoring', exact: false },
  { href: '/super-admin/activity', label: 'Activity Feed', icon: 'history', exact: false },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: 'security', exact: false },
];

export function MasterAdminSidebar({ adminEmail, adminRole }: MasterAdminSidebarProps) {
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

  const roleLabel =
    adminRole === 'super_admin' || adminRole === 'platform_super_admin'
      ? 'Super Admin'
      : adminRole === 'moderator' || adminRole === 'platform_moderator'
      ? 'Moderator'
      : 'Support';

  const roleBadgeColor =
    adminRole.includes('super_admin')
      ? 'bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30'
      : adminRole.includes('moderator')
      ? 'bg-[#0284C7]/15 text-[#0284C7] border-[#0284C7]/30'
      : 'bg-[#10B981]/15 text-[#059669] border-[#10B981]/30';

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-[#E6E2F0] px-4 py-3 shrink-0">
        <Link href="/super-admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">shield_person</span>
          </div>
          <span className="font-space font-bold text-sm tracking-tight text-[#17152B]">
            ARAM BTS <span className="text-[#7C5CFC]">Admin</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 text-[#77738A] hover:text-[#17152B]"
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
        className={`w-64 shrink-0 bg-white border-r border-[#E6E2F0] flex flex-col justify-between h-dvh max-h-dvh fixed md:sticky top-0 z-50 md:z-40 select-none transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 flex flex-col min-h-0 flex-1">
          {/* Header */}
          <div className="pb-5 border-b border-[#E6E2F0]">
            <div className="flex items-center justify-between">
              <Link href="/super-admin" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">shield_person</span>
                </div>
                <div>
                  <span className="font-space font-bold text-[#17152B] tracking-tight text-[16px] block leading-none">
                    ARAM BTS
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC]">
                    Master Admin
                  </span>
                </div>
              </Link>
              {mobileOpen && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="md:hidden text-[#77738A] p-1.5"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadgeColor}`}
              >
                {roleLabel}
              </span>
              <span className="text-[11px] text-[#77738A] font-medium">Platform Scope</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="mt-5 space-y-1 overflow-y-auto flex-1 pr-1">
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                    isActive
                      ? 'bg-[#F6F1FF] text-[#7C5CFC] font-semibold shadow-2xs'
                      : 'text-[#77738A] hover:text-[#17152B] hover:bg-[#F6F1FF]/60'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'text-[#7C5CFC]' : 'text-[#77738A]'
                    }`}
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
        <div className="p-4 border-t border-[#E6E2F0] bg-white flex flex-col gap-3">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C5CFC]/20 to-[#6366F1]/20 text-[#7C5CFC] flex items-center justify-center font-bold text-xs shrink-0 border border-[#7C5CFC]/30">
              {adminEmail.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[#17152B] truncate block">
                {adminEmail}
              </span>
              <span className="text-[10px] text-[#77738A] block">Platform Administrator</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/30 rounded-lg transition-colors w-full cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{loggingOut ? 'Signing out…' : 'Sign Out of Admin'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
