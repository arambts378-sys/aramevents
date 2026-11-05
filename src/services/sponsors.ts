import { createClient } from '@/lib/supabase/client';
import type { EventSponsor, SponsorPackage, SponsorRequestStatus } from '@/lib/events/sponsors';

export type SponsorInput = Omit<
  EventSponsor,
  'id' | 'event_id' | 'created_at' | 'updated_at' | 'package_id' | 'request_status'
>;
export type PackageInput = Omit<SponsorPackage, 'id' | 'event_id' | 'created_at'>;

export const sponsorsService = {
  list: async (eventId: string): Promise<EventSponsor[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_sponsors')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as EventSponsor[];
  },

  create: async (eventId: string, input: SponsorInput): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from('event_sponsors').insert({ ...input, event_id: eventId });
    if (error) throw error;
  },

  update: async (id: string, input: SponsorInput): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from('event_sponsors')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  /** Adds to the received amount. Only applies if nobody else changed it since the page loaded. */
  recordPayment: async (sponsor: EventSponsor, amountPaise: number): Promise<void> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_sponsors')
      .update({ amount_received: sponsor.amount_received + amountPaise, updated_at: new Date().toISOString() })
      .eq('id', sponsor.id)
      .eq('amount_received', sponsor.amount_received)
      .select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('This payment changed while you were editing. Close this and try again.');
  },

  /** Approving also puts the name on the website, which they can turn off when editing. */
  reviewRequest: async (id: string, status: Extract<SponsorRequestStatus, 'approved' | 'declined'>): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from('event_sponsors')
      .update({ request_status: status, show_on_website: status === 'approved', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  listPackages: async (eventId: string): Promise<SponsorPackage[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_sponsor_packages')
      .select('*')
      .eq('event_id', eventId)
      .order('amount', { ascending: false });
    if (error) throw error;
    return (data || []) as SponsorPackage[];
  },

  createPackage: async (eventId: string, input: PackageInput): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from('event_sponsor_packages').insert({ ...input, event_id: eventId });
    if (error) throw error;
  },

  updatePackage: async (id: string, input: PackageInput): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from('event_sponsor_packages').update(input).eq('id', id);
    if (error) throw error;
  },

  removePackage: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from('event_sponsor_packages').delete().eq('id', id);
    if (error) throw error;
  },

  remove: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from('event_sponsors').delete().eq('id', id);
    if (error) throw error;
  },
};
