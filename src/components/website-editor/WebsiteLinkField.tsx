'use client';

import React, { useState } from 'react';

/** The full public address of an event's website. */
export function publicWebsiteUrl(slug: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/events/${slug}`;
}

/** Copies text, falling back to a temporary selection when clipboard access is refused. */
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
}

/** The website's address with a copy button, for pasting into emails and social posts. */
export default function WebsiteLinkField({
  slug,
  path = '',
  label = 'Website link',
}: {
  slug: string;
  path?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${publicWebsiteUrl(slug)}${path}`;

  const handleCopy = async () => {
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        aria-label={label}
        className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-ds-line bg-ds-canvas text-[13px] text-ds-ink font-mono truncate outline-none focus:border-ds-accent"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 h-10 px-3.5 shrink-0 rounded-lg bg-ds-accent hover:bg-ds-accent-strong text-white text-[13px] font-semibold transition-colors font-jakarta"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          {copied ? 'check' : 'content_copy'}
        </span>
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${label.toLowerCase()} in a new tab`}
        className="inline-flex items-center justify-center h-10 w-10 shrink-0 rounded-lg border border-ds-line bg-white text-ds-ink hover:border-ds-accent hover:text-ds-accent transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_outward</span>
      </a>
    </div>
  );
}
