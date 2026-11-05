"use server";

import { createAdminClient } from '@/lib/supabase/admin';
import { isPublicRegistrationEnabled } from '@/lib/security/publicRegistration';
import { FieldErrors, SponsorRequestValues, hasErrors, validateSponsorRequest } from '@/lib/validation/forms';

/** Enough for a busy event, while stopping a script from filling an organizer's list. */
const MAX_PENDING_PER_EVENT = 100;

type RequestResult =
  | { ok: true; packageName: string; amount: number }
  | { ok: false; message?: string; fieldErrors?: FieldErrors };

/**
 * A public sponsor or partner request. The price always comes from the package in the
 * database, never from the browser. `trap` is a hidden field only bots fill in.
 */
export async function submitSponsorRequestAction(
  eventId: string,
  form: SponsorRequestValues,
  trap: string,
): Promise<RequestResult> {
  const fieldErrors = validateSponsorRequest(form);
  if (hasErrors(fieldErrors)) return { ok: false, fieldErrors };

  const unavailable = 'Sponsorship requests are not open for this event right now.';
  try {
    const supabase = createAdminClient();

    const { data: settings } = await supabase
      .from('event_registration_settings')
      .select('is_enabled')
      .eq('event_id', eventId)
      .maybeSingle();
    if (!isPublicRegistrationEnabled(settings)) return { ok: false, message: unavailable };

    const { data: pkg } = await supabase
      .from('event_sponsor_packages')
      .select('id, kind, name, amount')
      .eq('id', form.package_id)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .maybeSingle();
    if (!pkg) return { ok: false, fieldErrors: { package_id: 'This package is no longer available. Choose another.' } };

    // Looks like success to a bot, so it learns nothing, but saves nothing.
    if (trap) return { ok: true, packageName: pkg.name, amount: pkg.amount };

    const email = form.contact_email.trim().toLowerCase();

    const { count: alreadyPending } = await supabase
      .from('event_sponsors')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('contact_email', email)
      .eq('request_status', 'pending');
    if (alreadyPending) {
      return { ok: false, fieldErrors: { contact_email: 'A request from this email is already waiting for a reply.' } };
    }

    const { count: pending } = await supabase
      .from('event_sponsors')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('request_status', 'pending');
    if ((pending ?? 0) >= MAX_PENDING_PER_EVENT) return { ok: false, message: unavailable };

    const { error } = await supabase.from('event_sponsors').insert({
      event_id: eventId,
      kind: pkg.kind,
      name: form.organization.trim(),
      tier: pkg.name,
      package_id: pkg.id,
      amount_agreed: pkg.amount,
      amount_received: 0,
      contact_name: form.contact_name.trim(),
      contact_email: email,
      contact_phone: form.contact_phone.trim(),
      website_url: form.website_url.trim() || null,
      notes: form.message.trim() || null,
      request_status: 'pending',
      show_on_website: false,
    });
    if (error) throw error;

    return { ok: true, packageName: pkg.name, amount: pkg.amount };
  } catch (err) {
    console.error('Sponsor request failed:', err);
    return { ok: false, message: 'We could not send your request. Please try again.' };
  }
}
