'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Header({ currentUser }: { currentUser: any }) {
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

  return (
    <header className="mb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-ds-line">
        <div>
          <div className="text-[10px] font-mono text-ds-accent uppercase tracking-widest mb-2">Workspace Overview</div>
          <h1 className="text-4xl font-bold text-ds-ink mb-2 tracking-tight">
            Good morning, {currentUser?.name || 'Santhosh'}
          </h1>
          <p className="text-ds-muted text-lg">
            Manage your events, teams, registrations, and operations from one connected workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/events" className="px-4 py-2 border border-ds-line text-ds-ink font-medium rounded hover:bg-ds-subtle transition-colors">
            View Events
          </Link>
          <Link href="/app/events/new" className="px-4 py-2 bg-ds-accent text-white font-medium rounded hover:bg-ds-accent-strong transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Event</span>
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-3 py-2 border border-ds-line text-ds-danger hover:bg-ds-danger/10 font-medium text-sm rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden sm:inline">{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
