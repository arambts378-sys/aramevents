'use client';

import { useEffect, useState } from 'react';
import type { VenuePhoto, VenuePhotosResponse } from '@/app/api/venue-photos/[slug]/route';

type View = 'map' | 'satellite' | 'photos';

/** Google Maps links for a venue address, searched by text so no API key or coordinates are needed. */
export function venueMapLinks(query: string) {
  const q = encodeURIComponent(query);
  return {
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    open: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

/** False for online events and venues that are not set yet, where a map would point nowhere. */
export function hasMappableVenue(venue?: string | null) {
  const v = (venue || '').trim().toLowerCase();
  return !!v && v !== 'online' && v !== 'venue to be announced' && v !== 'tba';
}

/** Google's photos of the venue (empty when no Places key is set up or Google has none). */
function useVenuePhotos(slug?: string) {
  const [photos, setPhotos] = useState<VenuePhoto[]>([]);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    fetch(`/api/venue-photos/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<VenuePhotosResponse>) : null))
      .then((body) => {
        if (alive && body?.photos?.length) setPhotos(body.photos);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);
  return photos;
}

/**
 * A live Google Map of the venue, found from the address the organizer entered on the event.
 * Viewers can switch to satellite imagery of the site, and to photos of the venue: the
 * organizer's own upload first, then Google's photos of the place (with the credits Google requires).
 */
export function VenueMap({
  query,
  label,
  photo,
  slug,
  className = '',
}: {
  query: string;
  label: string;
  /** The organizer's own venue photo, if they uploaded one. */
  photo?: string | null;
  /** The event's slug, used to fetch Google's photos of the venue. */
  slug?: string;
  className?: string;
}) {
  const googlePhotos = useVenuePhotos(slug);
  const own: VenuePhoto | null =
    typeof photo === 'string' && /^https?:\/\//i.test(photo.trim())
      ? { url: photo.trim(), width: 0, height: 0, attributions: [] }
      : null;
  const gallery = own ? [own, ...googlePhotos] : googlePhotos;

  const [view, setView] = useState<View>('map');
  const [index, setIndex] = useState(0);
  const views: View[] = gallery.length ? ['map', 'satellite', 'photos'] : ['map', 'satellite'];
  const current: View = view === 'photos' && !gallery.length ? 'map' : view;
  const shown = gallery[Math.min(index, gallery.length - 1)];
  const step = (d: number) => setIndex((i) => (i + d + gallery.length) % gallery.length);

  const q = encodeURIComponent(query);
  const embedUrl =
    current === 'satellite'
      ? `https://www.google.com/maps?q=${q}&z=18&t=k&output=embed`
      : `https://www.google.com/maps?q=${q}&z=15&output=embed`;

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      {current === 'photos' && shown ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Google photo URLs and organizer uploads */}
          <img
            key={shown.url}
            src={shown.url}
            alt={`Photo ${index + 1} of ${gallery.length} of ${label}`}
            className="absolute inset-0 h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lg hover:bg-white"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lg hover:bg-white"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
              </button>
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-[11px] text-white/90">
            <span className="min-w-0 truncate">
              {shown === own ? (
                'Photo from the organizer'
              ) : (
                <>
                  {shown.attributions.length > 0 && (
                    <>
                      Photo:{' '}
                      {shown.attributions.map((a, i) => (
                        <span key={a.name + i}>
                          {i > 0 && ', '}
                          {a.uri ? (
                            <a href={a.uri} target="_blank" rel="noopener noreferrer" className="underline">
                              {a.name}
                            </a>
                          ) : (
                            a.name
                          )}
                        </span>
                      ))}
                      {' · '}
                    </>
                  )}
                  Google Maps
                </>
              )}
            </span>
            {gallery.length > 1 && (
              <span className="shrink-0 font-semibold tabular-nums">
                {index + 1} / {gallery.length}
              </span>
            )}
          </div>
        </>
      ) : (
        <iframe
          key={current}
          title={`Map of ${label}`}
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      )}
      <div
        className="absolute right-3 top-3 flex rounded-full border border-black/10 bg-white/95 p-1 text-[12px] font-bold text-neutral-800 shadow-lg"
        role="group"
        aria-label="Map view"
      >
        {views.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={current === v}
            className={`rounded-full px-3 py-1.5 capitalize transition-colors ${
              current === v ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
