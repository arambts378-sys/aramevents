'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { SetupProgress } from '@/lib/events/setupSteps';
import type { Event } from '@/types';

type Saved = Pick<SetupProgress, 'registration' | 'tickets' | 'people' | 'sponsors' | 'access'>;

/**
 * Which setup steps are finished, read from what the organizer has actually saved.
 * Reloads on navigation, so finishing a step shows up as soon as they move on.
 * Null until loaded.
 */
export function useEventSetupProgress(event: Event | undefined): SetupProgress | null {
  const pathname = usePathname();
  const [saved, setSaved] = useState<Saved | null>(null);
  const eventId = event?.id;
  const websiteLive = event?.website?.status === 'published';

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;

    async function load(id: string) {
      const supabase = createClient();
      const count = (table: string) =>
        supabase.from(table).select('id', { count: 'exact', head: true }).eq('event_id', id);

      const [registration, tickets, people, sponsors, zones] = await Promise.all([
        supabase.from('event_registration_settings').select('is_enabled').eq('event_id', id).maybeSingle(),
        count('event_ticket_types'),
        count('event_people'),
        count('event_sponsors'),
        count('access_zones'),
      ]);
      if (!mounted) return;
      setSaved({
        registration: Boolean(registration.data?.is_enabled),
        tickets: (tickets.count ?? 0) > 0,
        people: (people.count ?? 0) > 0,
        sponsors: (sponsors.count ?? 0) > 0,
        access: (zones.count ?? 0) > 0,
      });
    }

    load(eventId).catch((err) => console.error('Failed to load event setup progress:', err));
    return () => {
      mounted = false;
    };
  }, [eventId, pathname]);

  return saved && { details: true, website: websiteLive, ...saved };
}
