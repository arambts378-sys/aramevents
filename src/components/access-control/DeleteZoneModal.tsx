'use client';

import React, { useState } from 'react';
import { AccessZoneData } from './AccessZoneCard';

interface DeleteZoneModalProps {
  isOpen: boolean;
  zone: AccessZoneData | null;
  onClose: () => void;
  onConfirm: (zoneId: string) => Promise<void>;
}

export function DeleteZoneModal({
  isOpen,
  zone,
  onClose,
  onConfirm,
}: DeleteZoneModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !zone) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(zone.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete access zone');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E6E2F0]">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
          <span className="material-symbols-outlined text-[24px]">delete_forever</span>
        </div>

        <h3 className="font-space text-[20px] font-bold text-[#17152B]">
          Delete Access Zone
        </h3>
        <p className="font-jakarta text-[13px] text-[#77738A] mt-2 leading-relaxed">
          Are you sure you want to delete <strong className="text-[#17152B]">{zone.name}</strong>?
          This will permanently remove this checkpoint and its volunteer assignments.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[12px] font-jakarta">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl border border-[#E6E2F0] hover:bg-[#F6F1FF] text-[#17152B] font-jakarta text-[13px] font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-jakarta text-[13px] font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
          >
            {deleting && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>Delete Zone</span>
          </button>
        </div>
      </div>
    </div>
  );
}
