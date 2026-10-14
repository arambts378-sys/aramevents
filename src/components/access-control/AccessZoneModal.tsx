'use client';

import React, { useState, useEffect } from 'react';
import { AccessZoneData } from './AccessZoneCard';

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
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Zone name is required.');
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
      <div className="bg-white w-full max-w-xl rounded-2xl md:rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-[#E6E2F0]">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#E6E2F0]">
          <div>
            <h2 className="font-space text-[22px] font-bold text-[#17152B]">
              {isEdit ? 'Edit Access Zone' : 'Create Access Zone'}
            </h2>
            <p className="font-jakarta text-[13px] text-[#77738A] mt-0.5">
              {isEdit
                ? 'Update checkpoint details, credentials, and entitlement policies.'
                : 'Configure a new entry gate, checkpoint, or entitlement validation zone.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F6F1FF] text-[#77738A] hover:text-[#17152B] flex items-center justify-center transition-colors"
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Zone Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-jakarta text-[13px] font-semibold text-[#17152B] mb-1.5">
                Zone Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[#17152B] font-jakarta text-[14px] placeholder-[#77738A]/50 focus:outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
                placeholder="e.g. Main Gate (West)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-jakarta text-[13px] font-semibold text-[#17152B] mb-1.5">
                Zone Type *
              </label>
              <select
                className="w-full px-3.5 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[#17152B] font-jakarta text-[14px] focus:outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
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

          {/* Description */}
          <div>
            <label className="block font-jakarta text-[13px] font-semibold text-[#17152B] mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[#17152B] font-jakarta text-[14px] placeholder-[#77738A]/50 focus:outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
              placeholder="e.g. Primary attendee access via Concourse A"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block font-jakarta text-[13px] font-semibold text-[#17152B] mb-1.5">
              Physical Location (Optional)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[#17152B] font-jakarta text-[14px] placeholder-[#77738A]/50 focus:outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
              placeholder="e.g. Building 2, Ground Floor"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Checkboxes: QR Required & Allow Re-entry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F6F1FF]/60 rounded-xl border border-[#E6E2F0]">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-[#7C5CFC] focus:ring-[#7C5CFC] border-[#E6E2F0]"
                checked={formData.requires_qr}
                onChange={(e) => setFormData({ ...formData, requires_qr: e.target.checked })}
              />
              <div>
                <span className="font-jakarta text-[13px] font-semibold text-[#17152B] block">
                  QR Required
                </span>
                <span className="text-[11px] text-[#77738A] block">
                  Attendees must present a QR pass
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-[#7C5CFC] focus:ring-[#7C5CFC] border-[#E6E2F0]"
                checked={formData.allow_reentry}
                onChange={(e) => setFormData({ ...formData, allow_reentry: e.target.checked })}
              />
              <div>
                <span className="font-jakarta text-[13px] font-semibold text-[#17152B] block">
                  Allow Re-entry
                </span>
                <span className="text-[11px] text-[#77738A] block">
                  Attendees can scan multiple times
                </span>
              </div>
            </label>
          </div>

          {/* Conditional: Food Court Allocation */}
          {formData.zone_type === 'Food Court' && (
            <div className="p-4 bg-[#F6F1FF] rounded-xl border border-[#E6E2F0] space-y-3">
              <div className="flex items-center gap-2 text-[#7C5CFC] font-semibold text-[13px] font-jakarta">
                <span className="material-symbols-outlined text-[18px]">restaurant</span>
                <span>Food Court Entitlement Limit</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#17152B] mb-1">
                    Allocation Limit (Number)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-lg text-[13px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC]"
                    placeholder="e.g. 1"
                    value={formData.entitlement_limit}
                    onChange={(e) => setFormData({ ...formData, entitlement_limit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#17152B] mb-1">
                    Allocation Unit
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-lg text-[13px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC]"
                    placeholder="e.g. Meals"
                    value={formData.entitlement_unit}
                    onChange={(e) => setFormData({ ...formData, entitlement_unit: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Walkathon Checkpoint */}
          {formData.zone_type === 'Walkathon Checkpoint' && (
            <div className="p-4 bg-[#F6F1FF] rounded-xl border border-[#E6E2F0] space-y-3">
              <div className="flex items-center gap-2 text-[#7C5CFC] font-semibold text-[13px] font-jakarta">
                <span className="material-symbols-outlined text-[18px]">directions_run</span>
                <span>Walkathon Course Settings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#17152B] mb-1">
                    Checkpoint Type
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-lg text-[13px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC]"
                    value={formData.checkpoint_type}
                    onChange={(e) => setFormData({ ...formData, checkpoint_type: e.target.value })}
                  >
                    <option value="START">START</option>
                    <option value="CHECKPOINT">CHECKPOINT</option>
                    <option value="FINISH">FINISH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#17152B] mb-1">
                    Distance (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-lg text-[13px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC]"
                    placeholder="e.g. 5"
                    value={formData.distance_km}
                    onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#17152B] mb-1">
                    Sequence #
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-[#E6E2F0] rounded-lg text-[13px] text-[#17152B] focus:outline-none focus:border-[#7C5CFC]"
                    placeholder="e.g. 1"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#E6E2F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-[#E6E2F0] hover:bg-[#F6F1FF] text-[#17152B] font-jakarta text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-jakarta text-[13px] font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
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
