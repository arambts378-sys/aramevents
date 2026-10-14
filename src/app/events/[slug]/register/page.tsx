import React from 'react';
import PublicRegistrationClient from '@/components/event/PublicRegistrationClient';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function PublicRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const supabase = createAdminClient();
  
  // 1. Fetch the event either by slug or id
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-outline-variant/40 text-center shadow-sm">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">event_busy</span>
          <h1 className="text-title-lg font-bold text-on-surface mb-2">Registration Unavailable</h1>
          <p className="text-body-md text-on-surface-variant mb-8">Event not found.</p>
          <Link href="/app" className="px-6 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch the registration settings (auto-initialize if missing)
  let { data: settings } = await supabase
    .from('event_registration_settings')
    .select('*')
    .eq('event_id', event.id)
    .maybeSingle();

  if (!settings || !settings.is_enabled) {
    const { data: upsertedSettings } = await supabase
      .from('event_registration_settings')
      .upsert({
        event_id: event.id,
        is_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'event_id' })
      .select('*')
      .single();
    if (upsertedSettings) {
      settings = upsertedSettings;
    }
  }
  // 3. Fetch Walkathon distances if applicable
  let walkathonDistances: any[] = [];
  if (event.type === 'Walkathon') {
    const { data: distances } = await supabase
      .from('walkathon_distance_categories')
      .select('*')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .order('distance_km', { ascending: true });
      
    if (distances) {
      walkathonDistances = distances;
    }
  }

  // 4. Fetch available tickets for this event (Sanitized public availability)
  let tickets: any[] = [];
  try {
    const { data: ticketData, error: ticketError } = await supabase.rpc('get_event_ticket_availability', {
      p_event_id: event.id
    });
    if (!ticketError && Array.isArray(ticketData)) {
      tickets = ticketData;
    } else {
      // Fallback direct query if RPC is not yet created
      const { data: fallbackTickets } = await supabase
        .from('event_ticket_types')
        .select('id, event_id, name, description, ticket_type, price_amount, currency, quantity_total, min_per_order, max_per_order, sales_start_at, sales_end_at')
        .eq('event_id', event.id)
        .eq('is_active', true)
        .eq('visibility', 'public')
        .order('price_amount', { ascending: true });
      if (fallbackTickets) {
        tickets = fallbackTickets.map((t: any) => ({
          ...t,
          quantity_sold: 0,
          quantity_remaining: t.quantity_total,
          status: 'on_sale'
        }));
      }
    }
  } catch (tErr) {
    console.warn('Could not load tickets for public registration:', tErr);
  }

  return (
    <PublicRegistrationClient 
      event={event} 
      settings={settings} 
      slug={slug} 
      walkathonDistances={walkathonDistances} 
      isWalkathon={event?.type === 'Walkathon'}
      tickets={tickets}
    />
  );
}
