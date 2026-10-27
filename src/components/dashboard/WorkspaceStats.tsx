import React from 'react';

export function WorkspaceStats({ events }: { events: any[] }) {
  const activeEvents = events.filter(e => e.status !== 'archived').length;
  
  return (
    <section className="mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col border-r border-ds-line last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-ds-muted font-mono mb-2">Upcoming Events</span>
          <span className="text-4xl font-bold text-ds-ink">{activeEvents}</span>
        </div>
        <div className="flex flex-col border-r border-ds-line last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-ds-muted font-mono mb-2">Active Events</span>
          <span className="text-4xl font-bold text-ds-ink">{events.filter(e => e.status === 'published').length || 0}</span>
        </div>
        <div className="flex flex-col border-r border-ds-line last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-ds-muted font-mono mb-2">Registrations</span>
          <span className="text-4xl font-bold text-ds-ink">0</span>
        </div>
        <div className="flex flex-col border-r border-ds-line last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-ds-muted font-mono mb-2">Team Members</span>
          <span className="text-4xl font-bold text-ds-ink">1</span>
        </div>
      </div>
    </section>
  );
}
