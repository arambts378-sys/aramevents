'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { suspendWorkspaceAction } from '@/app/actions/superAdminActions';

interface WorkspaceSuspensionModalProps {
  workspace: {
    id: string;
    name: string;
    isSuspended: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceSuspensionModal({
  workspace,
  isOpen,
  onClose,
}: WorkspaceSuspensionModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const willSuspend = !workspace.isSuspended;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A valid justification of at least 3 characters is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await suspendWorkspaceAction(workspace.id, willSuspend, reason.trim());
      if (!res.ok) {
        setError(res.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error('Failed to change workspace suspension status:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspension-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[#E6E2F0]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                willSuspend
                  ? 'bg-[#FFDAD6] text-[#BA1A1A]'
                  : 'bg-[#DCFCE7] text-[#15803D]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {willSuspend ? 'pause_circle' : 'play_circle'}
              </span>
            </div>
            <div>
              <h2 id="suspension-title" className="font-space text-lg font-bold text-[#17152B]">
                {willSuspend ? 'Suspend Workspace' : 'Reactivate Workspace'}
              </h2>
              <p className="text-xs text-[#77738A]">{workspace.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#77738A] hover:text-[#17152B] p-1"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-[#FAF8FF] border border-[#E6E2F0] text-xs leading-relaxed text-[#5A566B]">
          <p className="font-semibold text-[#17152B] mb-1">
            {willSuspend ? 'Workspace Suspension Protocol:' : 'Reactivation Notice:'}
          </p>
          {willSuspend ? (
            <ul className="list-disc pl-4 space-y-1">
              <li>Restricts organizer access to event creation and website publishing.</li>
              <li>Preserves all event records, registrations, tickets, and user accounts.</li>
              <li>Does not delete or alter attendee or payment records.</li>
              <li>An administrative audit entry will be recorded with your justification.</li>
            </ul>
          ) : (
            <p>
              Reactivating this workspace will restore organizer access to event management and publishing privileges.
            </p>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]/40 text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="reason" className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1">
              Administrative Reason <span className="text-[#BA1A1A]">*</span>
            </label>
            <textarea
              id="reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                willSuspend
                  ? 'Specify reason for suspension (e.g. Terms violation, payment default, investigation)...'
                  : 'Specify reason for reactivation (e.g. Compliance verified, dispute resolved)...'
              }
              className="w-full rounded-xl border border-[#D8D3E3] p-3 text-sm text-[#17152B] outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A566B] hover:bg-[#F6F1FF] border border-[#E6E2F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 ${
                willSuspend
                  ? 'bg-[#BA1A1A] hover:bg-[#93000A]'
                  : 'bg-[#15803D] hover:bg-[#166534]'
              } disabled:opacity-50`}
            >
              {loading && (
                <span className="material-symbols-outlined text-[14px] animate-spin">
                  progress_activity
                </span>
              )}
              <span>{willSuspend ? 'Confirm Suspension' : 'Confirm Reactivation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
