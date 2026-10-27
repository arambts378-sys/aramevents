import React from 'react';
import Link from 'next/link';

export function YourEvents({ events }: { events: any[] }) {
  if (events.length === 0) return null;
  
  return (
    <section className="mb-16">
      <div className="flex items-end justify-between mb-8 border-b border-ds-line pb-4">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-ds-muted mb-1">Your Events</h2>
          <p className="text-lg text-ds-ink">All events in your portfolio.</p>
        </div>
        <Link href="/app/events" className="text-ds-accent font-medium hover:underline text-sm">
          View All Events &rarr;
        </Link>
      </div>
      
      <div className="bg-white border border-ds-line rounded">
        {events.map((event, index) => (
          <Link href={`/app/events/${event.id}`} key={event.id} className={`flex items-center justify-between p-4 hover:bg-ds-subtle transition-colors ${index !== events.length - 1 ? 'border-b border-ds-line' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-ds-subtle border border-ds-line rounded flex items-center justify-center overflow-hidden">
                {event.flyer ? (
                   <img src={event.flyer} alt={event.name} className="w-full h-full object-cover" />
                ) : (
                   <span className="text-[10px] font-mono text-ds-accent font-bold">{event.format?.substring(0,2).toUpperCase() || 'EV'}</span>
                )}
              </div>
              <div>
                <div className="font-bold text-ds-ink">{event.name}</div>
                <div className="text-sm text-ds-muted">{event.startDate} &middot; {event.type || 'Event'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono uppercase px-2 py-1 bg-ds-subtle text-ds-muted rounded border border-ds-line">
                {event.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
