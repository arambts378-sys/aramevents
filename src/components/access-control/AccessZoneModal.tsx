'use client';

import React, { useState, useEffect } from 'react';
import { AccessZoneData } from './AccessZoneCard';
import { MoreOptions } from '@/components/ui/MoreOptions';
import { FieldError, focusFirstError } from '@/components/ui/FieldError';
import { FieldErrors, hasErrors, validateZoneForm, withoutFieldError } from '@/lib/validation/forms';

interface AccessZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  initialData?: AccessZoneData | null;
  mode?: 'create' | 'edit';
}

export function AccessZoneModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: AccessZoneModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    zone_type: 'Checkpoint',
    description: '',
    location: '',
    requires_qr: true,
    allow_reentry: false,
    entitlement_limit: '',
    entitlement_unit: 'Meals',
    is_active: true,
    checkpoint_type: 'CHECKPOINT',
    distance_km: '',
    sequence: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        name: initialData.name || '',
        zone_type: initialData.zone_type || 'Checkpoint',
        description: initialData.description || '',
        location: initialData.location || '',
        requires_qr: initialData.requires_qr ?? true,
        allow_reentry: initialData.allow_reentry ?? false,
        entitlement_limit: initialData.entitlement_limit ? String(initialData.entitlement_limit) : '',
        entitlement_unit: initialData.entitlement_unit || 'Meals',
        is_active: initialData.is_active ?? true,
        checkpoint_type: initialData.checkpoint_type || 'CHECKPOINT',
        distance_km: initialData.distance_km !== null && initialData.distance_km !== undefined ? String(initialData.distance_km) : '',
        sequence: initialData.sequence ? String(initialData.sequence) : '',
      });
    } else {
      setFormData({
        name: '',
        zone_type: 'Checkpoint',
        description: '',
        location: '',
        requires_qr: true,
        allow_reentry: false,
        entitlement_limit: '',
        entitlement_unit: 'Meals',
        is_active: true,
        checkpoint_type: 'CHECKPOINT',
        distance_km: '',
        sequence: '',
      });
    }
    setErrorMessage(null);
    setFieldErrors({});
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateZoneForm(formData);
    setFieldErrors(found);
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the access zone.');
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl md:rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-ds-line">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-ds-line">
          <div>
            <h2 className="font-space text-[22px] font-bold text-ds-ink">
              {isEdit ? 'Edit Access Zone' : 'Create Access Zone'}
            </h2>
            <p className="font-jakarta text-[13px] text-ds-muted mt-0.5">
              {isEdit
                ? 'Update checkpoint details, credentials, and entitlement policies.'
                : 'A place where QR passes get scanned.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-ds-subtle text-ds-muted hover:text-ds-ink flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[13px] font-jakarta flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600 mt-0.5">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} onChange={(e) => setFieldErrors((prev) => withoutFieldError(prev, (e.target as unknown as HTMLInputElement).name))} noValidate className="mt-6 space-y-5">
          {/* Zone Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-jakarta text-[13px] font-semibold text-ds-ink mb-1.5">
                Zone Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-ds-ink font-jakarta text-[14px] placeholder-ds-muted/50 focus:outline-none focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 transition-all"
                placeholder="e.g. Main Gate (West)"
                name="name"
 aria-invalid={Boolean(fieldErrors.name)}
 value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
<FieldError message={fieldErrors.name} />
            </div>

            <div>
              <label className="block font-jakarta text-[13px] font-semibold text-ds-ink mb-1.5">
                Zone Type *
              </label>
              <select
                className="w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-ds-ink font-jakarta text-[14px] focus:outline-none focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 transition-all"
                value={formData.zone_type}
                onChange={(e) => setFormData({ ...formData, zone_type: e.target.value })}
              >
                <option value="Checkpoint">Checkpoint</option>
                <option value="Gate">Gate</option>
                <option value="Food Court">Food Court</option>
                <option value="VIP">VIP</option>
                <option value="Walkathon Checkpoint">Walkathon Checkpoint</option>
                <option value="Workshop">Workshop</option>
                <option value="Backstage">Backstage</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Conditional: Food Court Allocation */}
          {formData.zone_type === 'Food Court' && (
            <div className="p-4 bg-ds-accent-soft rounded-xl border border-ds-line space-y-3">
              <div className="flex items-center gap-2 text-ds-accent font-semibold text-[13px] font-jakarta">
                <span className="material-symbols-outlined text-[18px]">restaurant</span>
                <span>Limit per person (optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-ds-ink mb-1">
                    How many
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    placeholder="e.g. 1"
                    name="entitlement_limit"
 aria-invalid={Boolean(fieldErrors.entitlement_limit)}
 value={formData.entitlement_limit}
                    onChange={(e) => setFormData({ ...formData, entitlement_limit: e.target.value })}
                  />
<FieldError message={fieldErrors.entitlement_limit} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ds-ink mb-1">
                    Counted in
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    placeholder="e.g. Meals"
                    name="entitlement_unit"
 aria-invalid={Boolean(fieldErrors.entitlement_unit)}
 value={formData.entitlement_unit}
                    onChange={(e) => setFormData({ ...formData, entitlement_unit: e.target.value })}
                  />
<FieldError message={fieldErrors.entitlement_unit} />
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Walkathon Checkpoint */}
          {formData.zone_type === 'Walkathon Checkpoint' && (
            <div className="p-4 bg-ds-accent-soft rounded-xl border border-ds-line space-y-3">
              <div className="flex items-center gap-2 text-ds-accent font-semibold text-[13px] font-jakarta">
                <span className="material-symbols-outlined text-[18px]">directions_run</span>
                <span>Walkathon Course Settings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-ds-ink mb-1">
                    Checkpoint Type
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    value={formData.checkpoint_type}
                    onChange={(e) => setFormData({ ...formData, checkpoint_type: e.target.value })}
                  >
                    <option value="START">START</option>
                    <option value="CHECKPOINT">CHECKPOINT</option>
                    <option value="FINISH">FINISH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ds-ink mb-1">
                    Distance (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    placeholder="e.g. 5"
                    name="distance_km"
 aria-invalid={Boolean(fieldErrors.distance_km)}
 value={formData.distance_km}
                    onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                  />
<FieldError message={fieldErrors.distance_km} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ds-ink mb-1">
                    Sequence #
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-ds-line rounded-lg text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    placeholder="e.g. 1"
                    name="sequence"
 aria-invalid={Boolean(fieldErrors.sequence)}
 value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                  />
<FieldError message={fieldErrors.sequence} />
                </div>
              </div>
            </div>
          )}

          <MoreOptions defaultOpen={isEdit}>
          {/* Description */}
          <div>
            <label className="block font-jakarta text-[13px] font-semibold text-ds-ink mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-ds-ink font-jakarta text-[14px] placeholder-ds-muted/50 focus:outline-none focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 transition-all"
              placeholder="e.g. Primary attendee access via Concourse A"
              name="description"
 aria-invalid={Boolean(fieldErrors.description)}
 value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
<FieldError message={fieldErrors.description} />
          </div>

          {/* Location */}
          <div>
            <label className="block font-jakarta text-[13px] font-semibold text-ds-ink mb-1.5">
              Where is it? (Optional)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-ds-ink font-jakarta text-[14px] placeholder-ds-muted/50 focus:outline-none focus:border-ds-accent focus:ring-2 focus:ring-ds-accent/20 transition-all"
              placeholder="e.g. Building 2, Ground Floor"
              name="location"
 aria-invalid={Boolean(fieldErrors.location)}
 value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
<FieldError message={fieldErrors.location} />
          </div>

          {/* Checkboxes: QR Required & Allow Re-entry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-ds-accent-soft/60 rounded-xl border border-ds-line">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-ds-accent focus:ring-ds-accent border-ds-line"
                checked={formData.requires_qr}
                onChange={(e) => setFormData({ ...formData, requires_qr: e.target.checked })}
              />
              <div>
                <span className="font-jakarta text-[13px] font-semibold text-ds-ink block">
                  QR Required
                </span>
                <span className="text-[11px] text-ds-muted block">
                  Attendees must present a QR pass
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-ds-accent focus:ring-ds-accent border-ds-line"
                checked={formData.allow_reentry}
                onChange={(e) => setFormData({ ...formData, allow_reentry: e.target.checked })}
              />
              <div>
                <span className="font-jakarta text-[13px] font-semibold text-ds-ink block">
                  Allow Re-entry
                </span>
                <span className="text-[11px] text-ds-muted block">
                  Attendees can scan multiple times
                </span>
              </div>
            </label>
          </div>

          </MoreOptions>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-ds-line flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-ds-line hover:bg-ds-subtle text-ds-ink font-jakarta text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white font-jakarta text-[13px] font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{isEdit ? 'Save Changes' : 'Create Zone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
