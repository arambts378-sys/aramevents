import React from 'react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-ds-subtle rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-3xl text-ds-accent">event</span>
      </div>
      <h2 className="text-4xl font-bold text-ds-ink mb-4 tracking-tight">Your event workspace starts here.</h2>
      <p className="text-xl text-ds-muted mb-10 max-w-lg mx-auto">
        Create your first event and manage the full event lifecycle from one place.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/app/events/new" className="px-6 py-3 bg-ds-accent text-white font-medium rounded hover:bg-ds-accent-strong transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Create Event</span>
        </Link>
        <Link href="/" className="px-6 py-3 border border-ds-line text-ds-ink font-medium rounded hover:bg-ds-subtle transition-colors">
          Explore Platform
        </Link>
      </div>
    </div>
  );
}
