import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Live events',
  description: 'Browse events published on Aram Events and register online.',
};

// Always read the current list, so a newly published (or unpublished) event shows up straight away.
export const dynamic = 'force-dynamic';

interface PublicEvent {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  format: string | null;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  location: string | null;
  description: string | null;
  flyer_url: string | null;
  website: { status?: string } | null;
}

// The admin client bypasses RLS, so select only fields that are already public on each event page.
const PUBLIC_COLUMNS =
  'id,name,slug,type,format,start_date,start_time,end_date,location,description,flyer_url,website';

async function loadPublishedEvents(): Promise<PublicEvent[] | null> {
  try {
    const { data, error } = await createAdminClient()
      .from('events')
      .select(PUBLIC_COLUMNS)
      .eq('status', 'published')
      .order('start_date', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as PublicEvent[];
  } catch (err) {
    console.error('Could not load published events', err);
    return null;
  }
}

const formatDate = (date: string | null, time: string | null) => {
  if (!date) return 'Date to be announced';
  const d = new Date(`${date}T${time || '00:00'}`);
  const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  if (!time) return day;
  return `${day} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
};

function EventCard({ event, past }: { event: PublicEvent; past?: boolean }) {
  // The registration form works without a published website, so fall back to it.
  const href =
    event.website?.status === 'published' ? `/events/${event.slug}` : `/events/${event.slug}/register`;
  const venue = event.format === 'Virtual' ? 'Online' : event.location || 'Venue to be announced';

  return (
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-ds-line bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-ds-accent/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${
        past ? 'opacity-75' : ''
      }`}
    >
      <div className="relative aspect-[16/9] bg-ds-accent-soft">
        {event.flyer_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- flyers are user uploads on Supabase storage
          <img src={event.flyer_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-ds-accent/60" aria-hidden="true">
              event
            </span>
          </div>
        )}
        {event.type && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ds-ink backdrop-blur">
            {event.type}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-ds-ink group-hover:text-ds-accent-strong">{event.name}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ds-muted">
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">calendar_month</span>
          {formatDate(event.start_date, event.start_time)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ds-muted">
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
            {event.format === 'Virtual' ? 'videocam' : 'location_on'}
          </span>
          <span className="truncate">{venue}</span>
        </p>
        {event.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-ds-muted">{event.description}</p>
        )}
        <span className="mt-auto pt-4 text-sm font-semibold text-ds-accent-strong">
          {past ? 'View event' : 'View & register'} →
        </span>
      </div>
    </Link>
  );
}

export default async function LiveEventsPage() {
  const events = await loadPublishedEvents();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const upcoming = (events ?? []).filter((e) => !e.start_date || (e.end_date || e.start_date) >= today);
  const past = (events ?? []).filter((e) => e.start_date && (e.end_date || e.start_date) < today).reverse();

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-ds-accent-strong">Live events</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl">Find an event</h1>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-ds-muted">
          Every event published on Aram Events. Open one to see the details and register.
        </p>
      </div>

      {events === null ? (
        <p className="mt-12 text-center text-ds-muted">Events could not be loaded right now. Please try again shortly.</p>
      ) : events.length === 0 ? (
        <p className="mt-12 text-center text-ds-muted">No events are published yet. Check back soon.</p>
      ) : (
        <>
          <section aria-labelledby="upcoming-heading" className="mt-12">
            <h2 id="upcoming-heading" className="text-xl font-bold text-ds-ink">
              Upcoming &amp; ongoing <span className="font-medium text-ds-muted">({upcoming.length})</span>
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-ds-muted">No upcoming events right now.</p>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past-heading" className="mt-14">
              <h2 id="past-heading" className="text-xl font-bold text-ds-ink">
                Past events <span className="font-medium text-ds-muted">({past.length})</span>
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((e) => (
                  <EventCard key={e.id} event={e} past />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
