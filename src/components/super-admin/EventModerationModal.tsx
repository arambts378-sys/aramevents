'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { moderateEventAction } from '@/app/actions/superAdminActions';
import type { EventModerationAction } from '@/lib/super-admin/types';

interface EventModerationModalProps {
  event: {
    id: string;
    name: string;
    status: string;
    moderationStatus: string;
  };
  action: EventModerationAction;
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_DESCRIPTIONS: Record<
  EventModerationAction,
  { title: string; desc: string; buttonText: string; color: string }
> = {
  flag: {
    title: 'Flag Event for Review',
    desc: 'Marks this event as flagged for content investigation. The event remains published but is highlighted in the platform moderation queue.',
    buttonText: 'Confirm Flag',
    color: 'bg-[#F59E0B] hover:bg-[#D97706]',
  },
  suspend: {
    title: 'Suspend Event',
    desc: 'Immediately withdraws the event from public discovery and ticket purchases. Attendee tickets and check-in history are strictly preserved.',
    buttonText: 'Suspend Event',
    color: 'bg-[#BA1A1A] hover:bg-[#93000A]',
  },
  unpublish: {
    title: 'Unpublish Event to Draft',
    desc: 'Reverts the event website and registration to draft mode. Organizers can review and make required adjustments.',
    buttonText: 'Unpublish Event',
    color: 'bg-[#7C5CFC] hover:bg-[#6366F1]',
  },
  archive: {
    title: 'Archive Event',
    desc: 'Moves the event to archived state, concluding public registration while maintaining audit history.',
    buttonText: 'Archive Event',
    color: 'bg-[#4B5563] hover:bg-[#374151]',
  },
  restore: {
    title: 'Restore Event to Normal',
    desc: 'Clears moderation flags and restores normal published status for this event.',
    buttonText: 'Restore Event',
    color: 'bg-[#15803D] hover:bg-[#166534]',
  },
};

export function EventModerationModal({
  event,
  action,
  isOpen,
  onClose,
}: EventModerationModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const config = ACTION_DESCRIPTIONS[action];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A valid moderation justification of at least 3 characters is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await moderateEventAction(event.id, action, reason.trim());
      if (!res.ok) {
        setError(res.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error('Failed to moderate event:', err);
      setError('An unexpected error occurred during moderation.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="moderation-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[#E6E2F0]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </div>
            <div>
              <h2 id="moderation-title" className="font-space text-lg font-bold text-[#17152B]">
                {config.title}
              </h2>
              <p className="text-xs text-[#77738A]">{event.name}</p>
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
          <p className="font-semibold text-[#17152B] mb-1">Moderation Impact:</p>
          <p>{config.desc}</p>
          <p className="mt-1 text-[11px] text-[#77738A]">
            Current state: <strong>{event.status}</strong> (Moderation: <strong>{event.moderationStatus}</strong>)
          </p>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]/40 text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="mod-reason" className="block text-xs font-bold uppercase tracking-wider text-[#77738A] mb-1">
              Justification <span className="text-[#BA1A1A]">*</span>
            </label>
            <textarea
              id="mod-reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a specific reason for this moderation action (mandatory for audit)..."
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
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 ${config.color} disabled:opacity-50`}
            >
              {loading && (
                <span className="material-symbols-outlined text-[14px] animate-spin">
                  progress_activity
                </span>
              )}
              <span>{config.buttonText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
