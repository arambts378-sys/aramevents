'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import WebsiteLinkField from '@/components/website-editor/WebsiteLinkField';
import { formatPaiseToINR } from '@/services/ticketService';
import { sponsorsService } from '@/services/sponsors';
import { SponsorKind, SponsorPackage, rupeesToPaiseAmount } from '@/lib/events/sponsors';
import { FieldErrors, hasErrors, validatePackageForm, withoutFieldError } from '@/lib/validation/forms';

const INPUT =
  'w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent font-jakarta';

const EMPTY = { name: '', amount: '', description: '' };

/** The packages offered on the public registration page. */
export function SponsorPackagesPanel({ eventId, slug }: { eventId: string; slug: string }) {
  const [packages, setPackages] = useState<SponsorPackage[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SponsorPackage | null>(null);
  const [kind, setKind] = useState<SponsorKind>('sponsor');
  const [isActive, setIsActive] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setPackages(await sponsorsService.listPackages(eventId));
    } catch (err) {
      console.error('Failed to load packages:', err);
      setUnavailable(true);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (pkg: SponsorPackage | null) => {
    setEditing(pkg);
    setKind(pkg?.kind ?? 'sponsor');
    setIsActive(pkg?.is_active ?? true);
    setForm(pkg ? { name: pkg.name, amount: String(pkg.amount / 100), description: pkg.description ?? '' } : EMPTY);
    setErrors({});
    setFormError(null);
    setOpen(true);
  };

  const field = (name: keyof typeof EMPTY) => ({
    id: `package-${name}`,
    name,
    value: form[name],
    'aria-invalid': Boolean(errors[name]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [name]: e.target.value });
      setErrors(withoutFieldError(errors, name));
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validatePackageForm(form);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setSaving(true);
    const input = {
      kind,
      name: form.name.trim(),
      amount: rupeesToPaiseAmount(form.amount),
      description: form.description.trim() || null,
      is_active: isActive,
    };
    try {
      if (editing) await sponsorsService.updatePackage(editing.id, input);
      else await sponsorsService.createPackage(eventId, input);
      setOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to save package:', err);
      setFormError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await sponsorsService.removePackage(editing.id);
      setOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to delete package:', err);
      setFormError('Could not delete. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (unavailable) {
    return (
      <p role="alert" className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[13px] font-jakarta">
        Packages need a database update. Run supabase/migrations/20261105010000_sponsor_packages.sql.
      </p>
    );
  }

  const live = packages.filter((p) => p.is_active);

  return (
    <section className="bg-white border border-ds-line rounded-2xl p-5 shadow-xs space-y-4" aria-labelledby="packages-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="packages-title" className="text-[16px] font-bold text-ds-ink font-space">Packages on your registration form</h2>
          <p className="text-[12px] text-ds-muted font-jakarta mt-0.5">
            {live.length > 0
              ? 'Sponsors and partners pick one of these on your registration page.'
              : 'Add a package and sponsors and partners can sign up on your registration page.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-ds-line text-ds-ink font-semibold text-[13px] hover:border-ds-accent hover:text-ds-accent transition-colors font-jakarta"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
          <span>Add Package</span>
        </button>
      </div>

      {packages.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {packages.map((pkg) => (
            <li key={pkg.id}>
              <button
                type="button"
                onClick={() => openForm(pkg)}
                aria-label={`Edit ${pkg.name}`}
                className={`w-full h-full text-left p-3.5 rounded-xl border border-ds-line hover:border-ds-accent/60 transition-colors font-jakarta ${pkg.is_active ? '' : 'opacity-60'}`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-bold text-ds-ink truncate">{pkg.name}</span>
                  <span className="text-[13px] font-semibold text-ds-ink whitespace-nowrap">{formatPaiseToINR(pkg.amount)}</span>
                </span>
                <span className="block text-[11px] text-ds-muted capitalize mt-0.5">
                  {pkg.kind}{pkg.is_active ? '' : ' · Hidden'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {live.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-ds-ink font-jakarta">Link to send to sponsors</p>
          <WebsiteLinkField slug={slug} path={`/register?as=${live[0].kind}`} label="Sponsor sign-up link" />
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="package-form-title" className="bg-white border border-ds-line rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 font-jakarta">
            <h2 id="package-form-title" className="text-[18px] font-bold text-ds-ink font-space">
              {editing ? `Edit ${editing.name}` : 'Add Package'}
            </h2>
            {formError && (
              <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[13px]">{formError}</p>
            )}

            <form onSubmit={handleSave} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
                {(['sponsor', 'partner'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={kind === value}
                    onClick={() => setKind(value)}
                    className={`p-2.5 rounded-xl border text-[13px] font-bold capitalize transition-colors ${
                      kind === value ? 'border-ds-accent bg-ds-accent-soft text-ds-ink' : 'border-ds-line text-ds-muted hover:border-ds-accent/40'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="package-name" className="text-[13px] font-semibold text-ds-ink block mb-1">Package name *</label>
                <input type="text" placeholder="e.g. Gold Sponsor" className={INPUT} {...field('name')} />
                <FieldError message={errors.name} />
              </div>
              <div>
                <label htmlFor="package-amount" className="text-[13px] font-semibold text-ds-ink block mb-1">Amount (₹) *</label>
                <input type="text" inputMode="decimal" placeholder="50000" className={INPUT} {...field('amount')} />
                <FieldError message={errors.amount} />
              </div>
              <div>
                <label htmlFor="package-description" className="text-[13px] font-semibold text-ds-ink block mb-1">What they get (Optional)</label>
                <textarea rows={2} placeholder="e.g. Logo on the website and a stall at the venue" className={`${INPUT} resize-y`} {...field('description')} />
                <FieldError message={errors.description} />
              </div>
              <label className="flex items-center gap-2.5 text-[13px] text-ds-ink cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#6D50F5]" />
                <span>Show on the registration form</span>
              </label>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-ds-line">
                {editing ? (
                  <button type="button" onClick={handleDelete} disabled={saving} className="text-[13px] font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60">
                    Delete
                  </button>
                ) : <span />}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl border border-ds-line text-ds-ink font-semibold text-[13px] hover:bg-ds-subtle">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-ds-accent text-white font-semibold text-[13px] hover:bg-ds-accent-strong transition-colors disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
