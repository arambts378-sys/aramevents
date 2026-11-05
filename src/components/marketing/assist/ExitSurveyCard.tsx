'use client';

import React, { useState } from 'react';
import { EXIT_COMMENT_MAX, EXIT_REASONS, type ExitReasonId } from '@/lib/marketing/exitSurvey';

interface Props {
  /** Survey finished or dismissed; the robot tucks away */
  onClose: () => void;
  /** Visitor would rather ask the assistant */
  onChat: () => void;
}

/** "Leaving so soon?" Asked once per visit, when a visitor heads for another tab. */
export function ExitSurveyCard({ onClose, onChat }: Props) {
  const [reason, setReason] = useState<ExitReasonId | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/exit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          comment,
          page: window.location.pathname,
          device: window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop',
        }),
      });
      if (!res.ok && res.status !== 429) throw new Error('save failed');
      setStatus('sent');
      window.setTimeout(onClose, 2400);
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="text-center">
        <p className="font-display text-[17px] font-bold tracking-[0.01em] text-stage-ink">
          Thank you! <span aria-hidden="true">💜</span>
        </p>
        <p className="mt-1 text-[13.5px] leading-snug text-stage-ink/65">That really helps us make Aram better. See you soon!</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="font-display pr-6 text-[17px] font-bold tracking-[0.01em] text-stage-ink">Leaving so soon?</p>
      <p className="mt-1 text-[13px] leading-snug text-stage-ink/65">Mind telling me why? It takes one tap.</p>

      <fieldset className="mt-3">
        <legend className="sr-only">Why are you leaving?</legend>
        <div className="flex flex-wrap gap-1.5">
          {EXIT_REASONS.map((r) => {
            const on = r.id === reason;
            return (
              <label
                key={r.id}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors focus-within:ring-2 focus-within:ring-stage-violet ${
                  on ? 'border-stage-violet bg-stage-violet text-white' : 'border-stage-ink/12 bg-white text-stage-ink/75 hover:border-stage-violet/50'
                }`}
              >
                <input type="radio" name="exit-reason" value={r.id} checked={on} onChange={() => setReason(r.id)} className="sr-only" />
                {r.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {reason && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={EXIT_COMMENT_MAX}
          rows={2}
          placeholder="Anything else? (optional)"
          aria-label="Anything else you would like to tell us"
          className="mt-3 w-full resize-none rounded-xl border border-stage-ink/12 px-3 py-2 text-[13px] text-stage-ink placeholder:text-stage-ink/40 focus:border-stage-violet focus:outline-none"
        />
      )}

      {status === 'error' && <p className="mt-2 text-[12px] text-red-600">That didn&apos;t send. Try once more?</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={!reason || status === 'sending'}
          className="rounded-full bg-stage-violet px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#5A3DE0] disabled:bg-stage-ink/15 disabled:text-stage-ink/40"
        >
          {status === 'sending' ? 'Sending…' : 'Send'}
        </button>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-stage-ink/55 hover:bg-stage-paper hover:text-stage-ink">
          No thanks
        </button>
        <button type="button" onClick={onChat} className="ml-auto text-[12.5px] font-semibold text-stage-violet hover:underline">
          Ask me instead
        </button>
      </div>
    </form>
  );
}
