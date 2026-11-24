import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Google's photos of an event's venue, for the venue map on the public event website.
 *
 * Looks the venue up with the Places API (New) from the address saved on the event, so callers
 * can't spend the key on arbitrary searches, and returns short-lived photo URLs (no key in them)
 * plus the photographer credits Google requires us to show.
 *
 * Needs GOOGLE_PLACES_API_KEY (server only). Without it this returns no photos and the site shows the map alone.
 */

export interface VenuePhoto {
  url: string;
  width: number;
  height: number;
  attributions: { name: string; uri?: string }[];
}

export interface VenuePhotosResponse {
  placeName: string | null;
  mapsUrl: string | null;
  photos: VenuePhoto[];
}

const MAX_PHOTOS = 5; // each photo is a billed Place Photo request
const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; body: VenuePhotosResponse }>();

const empty: VenuePhotosResponse = { placeName: null, mapsUrl: null, photos: [] };

type Section = { type?: string; content?: { mapQuery?: unknown } | null };

function venueQuery(event: { location: string | null; website: unknown }): string | null {
  const sections = ((event.website as { published?: { sections?: Section[] } } | null)?.published?.sections ?? []) as Section[];
  const custom = sections.find((s) => s?.type === 'venue')?.content?.mapQuery;
  const q = (typeof custom === 'string' && custom.trim()) || (event.location || '').trim();
  const lower = q.toLowerCase();
  if (!q || lower === 'online' || lower === 'venue to be announced' || lower === 'tba') return null;
  return q;
}

async function lookUp(query: string, key: string): Promise<VenuePhotosResponse> {
  const search = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.googleMapsUri,places.photos',
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });
  if (!search.ok) throw new Error(`Places search failed (${search.status}): ${(await search.text()).slice(0, 300)}`);

  const place = ((await search.json()) as {
    places?: {
      displayName?: { text?: string };
      googleMapsUri?: string;
      photos?: { name: string; widthPx?: number; heightPx?: number; authorAttributions?: { displayName?: string; uri?: string }[] }[];
    }[];
  }).places?.[0];
  if (!place) return empty;

  const photos = await Promise.all(
    (place.photos ?? []).slice(0, MAX_PHOTOS).map(async (p): Promise<VenuePhoto | null> => {
      const res = await fetch(
        `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1600&skipHttpRedirect=true&key=${encodeURIComponent(key)}`
      );
      if (!res.ok) return null;
      const { photoUri } = (await res.json()) as { photoUri?: string };
      if (!photoUri) return null;
      return {
        url: photoUri,
        width: p.widthPx ?? 0,
        height: p.heightPx ?? 0,
        attributions: (p.authorAttributions ?? [])
          .filter((a) => a.displayName)
          .map((a) => ({ name: a.displayName!, uri: a.uri })),
      };
    })
  );

  return {
    placeName: place.displayName?.text ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    photos: photos.filter((p): p is VenuePhoto => p !== null),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json(empty);

  const { slug } = await params;
  const { data: event } = await createAdminClient()
    .from('events')
    .select('location,website,status')
    .eq('slug', slug)
    .maybeSingle();

  // Only events whose website is public, so this can't be used to look up unpublished ones.
  const website = event?.website as { status?: string } | null | undefined;
  if (!event || event.status !== 'published' || website?.status !== 'published') {
    return NextResponse.json(empty, { status: 404 });
  }

  const query = venueQuery(event);
  if (!query) return NextResponse.json(empty);

  const hit = cache.get(query);
  let body = hit && Date.now() - hit.at < CACHE_MS ? hit.body : null;
  if (!body) {
    try {
      body = await lookUp(query, key);
      cache.set(query, { at: Date.now(), body });
    } catch (err) {
      console.error('Venue photo lookup failed', err);
      return NextResponse.json(empty);
    }
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=21600' },
  });
}
