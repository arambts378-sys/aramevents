'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FieldError } from '@/components/ui/FieldError';
import { DEFAULT_SPONSOR_OPTIONS, GSTIN_PATTERN, sponsorOptionsFrom, type SponsorOptions } from '@/lib/events/sponsors';

const MAX_MIN_RUPEES = 1_000_000;

/** Organizer switches: custom sponsorship amounts (with a minimum) and partner requests without a package. */
export function SponsorOptionsPanel({ eventId }: { eventId: string }) {
  const [options, setOptions] = useState<SponsorOptions | null>(null);
  const [minRupees, setMinRupees] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [gst, setGst] = useState({ legalName: '', gstin: '', address: '' });
  const [gstSaved, setGstSaved] = useState(gst);
  const [gstError, setGstError] = useState<string | null>(null);
  const [gstStatus, setGstStatus] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from('event_registration_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError) {
          setUnavailable(true);
          return;
        }
        if (data && !('accept_custom_sponsorship' in data)) {
          setUnavailable(true);
          return;
        }
        const loaded = data ? sponsorOptionsFrom(data) : DEFAULT_SPONSOR_OPTIONS;
        setOptions(loaded);
        setMinRupees(String(loaded.customSponsorshipMin / 100));
        const details = {
          legalName: (data?.seller_legal_name as string | null) ?? '',
          gstin: (data?.seller_gstin as string | null) ?? '',
          address: (data?.seller_address as string | null) ?? '',
        };
        setGst(details);
        setGstSaved(details);
      });
  }, [eventId]);

  const saveGst = async () => {
    const gstin = gst.gstin.trim().toUpperCase();
    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      setGstError('Enter a valid 15-character GSTIN, like 33ABCDE1234F1Z5.');
      return;
    }
    if (gst.legalName.trim().length > 160 || gst.address.trim().length > 500) {
      setGstError('The legal name or address is too long.');
      return;
    }
    setGstError(null);
    setGstStatus(null);
    const next = { legalName: gst.legalName.trim(), gstin, address: gst.address.trim() };
    const { error: saveError } = await createClient()
      .from('event_registration_settings')
      .update({
        seller_legal_name: next.legalName || null,
        seller_gstin: next.gstin || null,
        seller_address: next.address || null,
      })
      .eq('event_id', eventId);
    if (saveError) {
      setGstError('Could not save. Turn on registration for this event first, then try again.');
      return;
    }
    setGst(next);
    setGstSaved(next);
    setGstStatus('Saved. New invoices will use these details.');
  };
  const gstChanged = JSON.stringify(gst) !== JSON.stringify(gstSaved);

  if (unavailable) {
    return (
      <p role="alert" className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[13px] font-jakarta">
        Custom sponsorship amounts need a database update. Run supabase/migrations/20261114020000_custom_sponsorship_and_invoices.sql.
      </p>
    );
  }
  if (!options) return null;

  const save = async (next: SponsorOptions, nextMinRupees = minRupees) => {
    const min = Number(nextMinRupees);
    if (!/^\d+(\.\d{1,2})?$/.test(nextMinRupees.trim()) || min < 1 || min > MAX_MIN_RUPEES) {
      setError(`Enter a minimum between ₹1 and ₹${MAX_MIN_RUPEES.toLocaleString('en-IN')}.`);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: saveError } = await createClient()
      .from('event_registration_settings')
      .update({
        accept_custom_sponsorship: next.acceptCustomSponsorship,
        custom_sponsorship_min: Math.round(min * 100),
        accept_partner_requests: next.acceptPartnerRequests,
      })
      .eq('event_id', eventId);
    setSaving(false);
    if (saveError) {
      setError('Could not save. Turn on registration for this event first, then try again.');
      return;
    }
    setOptions({ ...next, customSponsorshipMin: Math.round(min * 100) });
    setSaved(true);
  };

  const toggle = (key: 'acceptCustomSponsorship' | 'acceptPartnerRequests') => save({ ...options, [key]: !options[key] });

  return (
    <div className="rounded-xl border border-ds-line p-4 space-y-3 font-jakarta">
      <p className="text-[13px] font-semibold text-ds-ink">Without a package</p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-[var(--color-ds-accent,#5A3DE0)]"
          checked={options.acceptCustomSponsorship}
          disabled={saving}
          onChange={() => toggle('acceptCustomSponsorship')}
        />
        <span className="text-[13px] text-ds-ink">
          Sponsors can pay an amount of their choice
          <span className="block text-[12px] text-ds-muted">Shows &ldquo;Choose your own amount&rdquo; next to your sponsor packages.</span>
        </span>
      </label>

      {options.acceptCustomSponsorship && (
        <div className="pl-7 space-y-1">
          <label htmlFor="custom-min" className="text-[12px] font-semibold text-ds-ink">Minimum amount (₹)</label>
          <div className="flex gap-2">
            <input
              id="custom-min"
              type="text"
              inputMode="decimal"
              value={minRupees}
              onChange={(e) => {
                setMinRupees(e.target.value);
                setSaved(false);
              }}
              className="w-36 px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
            />
            <button
              type="button"
              disabled={saving || minRupees === String(options.customSponsorshipMin / 100)}
              onClick={() => save(options)}
              className="px-3 h-9 rounded-lg border border-ds-line text-[13px] font-semibold text-ds-ink hover:border-ds-accent hover:text-ds-accent disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-[var(--color-ds-accent,#5A3DE0)]"
          checked={options.acceptPartnerRequests}
          disabled={saving}
          onChange={() => toggle('acceptPartnerRequests')}
        />
        <span className="text-[13px] text-ds-ink">
          Partners can apply without a package
          <span className="block text-[12px] text-ds-muted">They describe the partnership and can add an amount if they want to pay.</span>
        </span>
      </label>

      <FieldError message={error ?? undefined} />
      {saved && <p role="status" className="text-[12px] text-green-700">Saved.</p>}

      <div className="border-t border-ds-line pt-3 space-y-2">
        <p className="text-[13px] font-semibold text-ds-ink">GST details for invoices</p>
        <p className="text-[12px] text-ds-muted">
          Sponsors and partners pay 18% GST on top of the amount. With your GSTIN filled in, their invoice is a GST tax invoice.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-ds-ink">Legal / business name</span>
            <input
              type="text"
              value={gst.legalName}
              onChange={(e) => setGst({ ...gst, legalName: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-ds-ink">GSTIN</span>
            <input
              type="text"
              maxLength={15}
              placeholder="33ABCDE1234F1Z5"
              value={gst.gstin}
              onChange={(e) => setGst({ ...gst, gstin: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] font-mono text-ds-ink uppercase focus:outline-none focus:border-ds-accent"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-[12px] font-semibold text-ds-ink">Registered address</span>
          <textarea
            rows={2}
            value={gst.address}
            onChange={(e) => setGst({ ...gst, address: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent resize-y"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!gstChanged}
            onClick={saveGst}
            className="px-3 h-9 rounded-lg border border-ds-line text-[13px] font-semibold text-ds-ink hover:border-ds-accent hover:text-ds-accent disabled:opacity-50"
          >
            Save GST details
          </button>
          {gstStatus && <p role="status" className="text-[12px] text-green-700">{gstStatus}</p>}
        </div>
        <FieldError message={gstError ?? undefined} />
      </div>
    </div>
  );
}
