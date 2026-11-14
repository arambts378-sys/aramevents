'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useTransition,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { buildDefaultWebsite, buildEventSlug } from '@/lib/events/defaultWebsite';
import type { AgentTurn } from '@/lib/ai/eventDraft';
import { readFlyerText } from '@/lib/flyer/ocr';
import { localChatTurn, localFlyerTurn } from '@/lib/flyer/localAgent';
import type { Details } from '@/lib/flyer/parseEventText';
import type {
  ChatMessage,
  ConversationStage,
  ExtractedEventDetails,
} from '@/lib/ai/types';
import { AgentHistoryPanel } from '@/components/agent/AgentHistoryPanel';
import { agentConversationsService, isHistoryUnavailable } from '@/services/agentConversations';
import {
  conversationTitle,
  fromStored,
  toStored,
  type ConversationSummary,
} from '@/lib/ai/conversationHistory';

const SAVE_DELAY_MS = 800;

/** Keeps the open chat in the address bar (?c=id), so it can be reloaded or shared with yourself. */
function setChatUrl(id: string | null) {
  const url = id ? `/app/agent?c=${id}` : '/app/agent';
  if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url);
}

/* ─────────────────────────── helpers ─────────────────────────── */

type UiMessage = ChatMessage & {
  /** Flyer attached to a user message, rendered as a thumbnail card */
  attachment?: { name: string; url: string };
  /** The reply is still arriving */
  streaming?: boolean;
  /** The organizer pressed Stop before the reply finished */
  stopped?: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function assistantMsg(content: string, extra?: Partial<UiMessage>): UiMessage {
  return { id: uid(), role: 'assistant', content, timestamp: new Date(), ...extra };
}

function userMsg(content: string, extra?: Partial<UiMessage>): UiMessage {
  return { id: uid(), role: 'user', content, timestamp: new Date(), ...extra };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type FlyerImages = { main: string; crops: string[] };

/** What the server sends about the flyer: the image(s) on the reading turn, the transcription afterwards. */
type FlyerInput = {
  images: FlyerImages;
  extract: boolean;
  text: string | null;
  /** The original upload, which on-device OCR reads at full resolution */
  source: { dataUri: string; name: string };
} | null;

type AgentReply = AgentTurn & { flyerText?: string };

/**
 * Sends the conversation to the server route, which calls the model and returns a reply plus the full draft.
 * Chat turns stream: `onDelta` receives the reply text as it is written. Reading a flyer does not stream
 * (the server reads it, checks it and may read it again before answering).
 */
async function askAgent(
  history: UiMessage[],
  draft: ExtractedEventDetails | null,
  flyer: FlyerInput,
  /** The flyer's transcription when the image itself is not at hand (a chat reopened from history) */
  savedFlyerText: string | null = null,
  opts: { onDelta?: (text: string) => void; signal?: AbortSignal } = {},
): Promise<AgentReply> {
  const stream = !flyer?.extract && !!opts.onDelta;
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      draft,
      image: flyer?.images.main ?? null,
      crops: flyer?.extract ? flyer.images.crops : undefined,
      extract: flyer?.extract ?? false,
      flyerText: flyer?.text ?? savedFlyerText ?? undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      stream,
    }),
  });
  if (!res.ok || !stream || !res.body) {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.error || 'The assistant is unavailable right now. Try again in a few minutes.');
      (err as Error & { code?: string }).code = json.code;
      throw err;
    }
    return json as AgentReply;
  }

  // Newline-delimited JSON: {type:'delta'|'done'|'error'}
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const event = JSON.parse(line) as { type: string; text?: string; turn?: AgentReply; error?: string };
      if (event.type === 'delta' && event.text) opts.onDelta?.(event.text);
      else if (event.type === 'done' && event.turn) return event.turn;
      else if (event.type === 'error') throw new Error(event.error || 'The assistant is unavailable right now.');
    }
  }
  throw new Error('The assistant stopped before finishing its answer. Please try again.');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Writes a finished reply out progressively (about a second and a half), like a streamed one. */
async function revealText(text: string, onProgress: (shown: string) => void, signal: AbortSignal) {
  const step = Math.max(2, Math.ceil(text.length / 90));
  for (let i = step; i < text.length; i += step) {
    if (signal.aborted) return;
    onProgress(text.slice(0, i));
    await sleep(16);
  }
  if (!signal.aborted) onProgress(text);
}

const isAbort = (err: unknown) => (err as Error)?.name === 'AbortError';

/** Larger images are accepted and compressed in the browser before anything is sent or stored */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAIN_EDGE = 2400;
const CROP_EDGE = 2000;
const MAX_UPLOAD_CHARS = 6.5 * 1024 * 1024; // base64 length of a 5 MB image, less a margin

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That flyer image could not be opened.'));
    img.src = src;
  });
}

/** Draws a region of the image onto a white canvas no larger than `edge`, as a JPEG under the size limit. */
function renderRegion(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, edge: number) {
  const scale = Math.min(1, edge / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.92, 0.85, 0.75]) {
    const out = canvas.toDataURL('image/jpeg', quality);
    if (out.length < MAX_UPLOAD_CHARS) return out;
  }
  return canvas.toDataURL('image/jpeg', 0.6);
}

/**
 * Prepares the flyer for reading: the whole flyer at a sharp size, plus two overlapping
 * halves along its long side so small print (dates, prices, emails) is read up close.
 */
async function prepareFlyer(dataUri: string): Promise<FlyerImages> {
  const img = await loadImage(dataUri);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const main = renderRegion(img, 0, 0, w, h, MAIN_EDGE);
  // Small images gain nothing from crops
  if (Math.max(w, h) < 1000) return { main, crops: [] };
  const portrait = h >= w;
  const long = portrait ? h : w;
  const span = Math.round(long * 0.6);
  const crops = [0, long - span].map((offset) =>
    portrait ? renderRegion(img, 0, offset, w, span, CROP_EDGE) : renderRegion(img, offset, 0, span, h, CROP_EDGE),
  );
  return { main, crops };
}

/** Model output uses null for unknown fields; the UI uses undefined. */
function toDetails(d: AgentTurn['details']): ExtractedEventDetails {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) if (v !== null) out[k] = v;
  return out as unknown as ExtractedEventDetails;
}

const hasDraft = (d: ExtractedEventDetails) => !!(d.name || d.startDate || d.date || d.venue || d.eventType);

/** What createEvent needs that the draft is still missing, in the form's own words. */
function missingForCreate(d: ExtractedEventDetails) {
  const missing: string[] = [];
  if (!d.name?.trim()) missing.push('event name');
  if (!d.eventType) missing.push('event type');
  if (!d.format) missing.push('format');
  if (!(d.startDate || d.date)) missing.push('start date');
  if (!d.startTime) missing.push('start time');
  if (!d.endTime) missing.push('end time');
  if (d.format !== 'Virtual' && !d.venue?.trim()) missing.push('venue');
  return missing;
}

/**
 * Decodes a base64 data URI in memory. Not `fetch(dataUri)`: the CSP's connect-src does not
 * allow data: URLs, so the browser rejects that with "Failed to fetch".
 */
function dataUriToBlob(dataUri: string) {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUri);
  if (!match) throw new Error('The flyer image could not be read.');
  const bytes = atob(match[2]);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: match[1] });
}

/** Uploads the flyer for the website banner. Returns undefined on failure: the event is still created without it. */
async function uploadFlyer(dataUri: string) {
  try {
    const blob = dataUriToBlob(dataUri);
    const form = new FormData();
    form.append('file', blob, `flyer.${blob.type.split('/')[1] || 'png'}`);
    const res = await fetch('/api/events/flyer-upload', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) console.warn('Flyer upload failed:', json.error || res.status);
    return res.ok && json.url ? (json.url as string) : undefined;
  } catch (err) {
    console.warn('Flyer upload failed:', err);
    return undefined;
  }
}

const SUGGESTIONS = [
  { icon: 'upload_file', label: 'Upload an event flyer', prompt: null },
  { icon: 'mic', label: 'Tech conference', prompt: 'Tech conference in Hyderabad, Dec 2026, around 500 attendees' },
  { icon: 'directions_walk', label: 'Charity walkathon', prompt: 'Charity walkathon in Bengaluru next March, free registration' },
  { icon: 'school', label: 'Workshop', prompt: 'Two-day design workshop for 40 people with paid tickets' },
] as const;

/* Small markdown: paragraphs, headings, bullet and numbered lists, **bold**, *italic*, `code` and https links */
function renderInline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s][^*]*\*)/g).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={key} className="rounded bg-ds-ink/[0.06] px-1.5 py-0.5 font-mono text-[13px]">{part.slice(1, -1)}</code>;
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link) {
      return <a key={key} href={link[2]} target="_blank" rel="noreferrer noopener" className="text-ds-accent underline underline-offset-2 hover:text-ds-accent-strong">{link[1]}</a>;
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function renderMarkdown(text: string) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    const k = blocks.length;
    const children = items.map((item, i) => <li key={i} className="pl-1">{renderInline(item, `li-${k}-${i}`)}</li>);
    blocks.push(
      ordered ? (
        <ol key={`ol-${k}`} className="list-decimal pl-6 space-y-1.5 marker:text-ds-muted">{children}</ol>
      ) : (
        <ul key={`ul-${k}`} className="list-disc pl-6 space-y-1.5 marker:text-ds-muted">{children}</ul>
      ),
    );
    list = null;
  };

  text.split('\n').forEach((line) => {
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      return;
    }
    flushList();
    const heading = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (heading) {
      blocks.push(<h3 key={`h-${blocks.length}`} className="text-[15px] font-semibold text-ds-ink pt-1">{renderInline(heading[1], `h-${blocks.length}`)}</h3>);
    } else if (line.trim()) {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line, `p-${blocks.length}`)}</p>);
    }
  });
  flushList();
  return blocks;
}

/* Follow-up chips under the latest reply, so the next step is one click away */
type FollowUp = { label: string; icon: string } & (
  | { kind: 'fill'; text: string }
  | { kind: 'send'; text: string }
  | { kind: 'create' }
  | { kind: 'upload' }
);

const FILL_FOR_MISSING: Record<string, { label: string; text: string }> = {
  'event name': { label: 'Name the event', text: 'The event is called ' },
  'event type': { label: 'Set the event type', text: 'It is a ' },
  format: { label: 'In person or online?', text: 'The event is ' },
  'start date': { label: 'Add the date', text: 'It is on ' },
  'start time': { label: 'Add the start time', text: 'It starts at ' },
  'end time': { label: 'Add the end time', text: 'It ends at ' },
  venue: { label: 'Add the venue', text: 'The venue is ' },
};

function followUpsFor(draft: ExtractedEventDetails | null): FollowUp[] {
  if (!draft || !hasDraft(draft)) {
    return [
      { kind: 'upload', label: 'Upload a flyer', icon: 'upload_file' },
      { kind: 'fill', label: 'Describe the event', icon: 'edit', text: 'My event is ' },
    ];
  }
  const missing = missingForCreate(draft);
  if (missing.length) {
    return missing.slice(0, 3).map((m) => ({ kind: 'fill' as const, icon: 'add', ...FILL_FOR_MISSING[m] }));
  }
  return [
    { kind: 'create', label: 'Create the event', icon: 'check_circle' },
    { kind: 'send', label: 'Write a description', icon: 'notes', text: 'Write a short, friendly description for this event.' },
    { kind: 'fill', label: 'Add ticket types', icon: 'confirmation_number', text: 'Ticket types: ' },
  ];
}

/* ─────────────────────────── sub-components ──────────────────── */

function AgentMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined text-ds-accent ${className}`}
      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
    >
      auto_awesome
    </span>
  );
}

/** The assistant's avatar: the sparkle on a soft round badge, pulsing while it writes */
function AgentAvatar({ active = false }: { active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ds-accent-soft to-white ring-1 ring-ds-accent/15 ${active ? 'agent-avatar-active' : ''}`}
    >
      <AgentMark className="text-[18px]" />
    </span>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="agent-dot h-1.5 w-1.5 rounded-full bg-ds-muted" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

function ThinkingIndicator({ ocrProgress, readingFlyer }: { ocrProgress: number | null; readingFlyer: boolean }) {
  // Reading a flyer takes a while (read, check, sometimes a second look), so say what is happening.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const label =
    ocrProgress !== null
      ? `Reading the flyer on this device… ${Math.round(ocrProgress * 100)}%`
      : readingFlyer
        ? elapsed < 6 ? 'Reading your flyer' : elapsed < 18 ? 'Checking dates, times and venue' : 'Taking a closer look at the small print'
        : 'Thinking';
  return (
    <div className="flex items-center gap-3.5" role="status" aria-live="polite">
      <AgentAvatar active />
      <span className="flex items-center gap-2 text-[14px] text-ds-muted">
        <span className="agent-shimmer">{label}</span>
        <TypingDots />
      </span>
    </div>
  );
}

function IconAction({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-md text-ds-muted hover:text-ds-ink hover:bg-ds-ink/[0.05] transition-colors disabled:opacity-40 disabled:pointer-events-none"
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
    </button>
  );
}

/* Extraction review field (top-level so its edit state survives parent re-renders) */
function ExtractionRow({
  label,
  field,
  value,
  uncertain,
  onEdit,
}: {
  label: string;
  field: keyof ExtractedEventDetails;
  value?: string;
  uncertain?: boolean;
  onEdit: (field: keyof ExtractedEventDetails, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = () => {
    onEdit(field, val);
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border-b border-ds-line last:border-0 ${uncertain ? 'bg-[#FFFBEB]' : ''}`}
    >
      <span className="text-[13px] text-ds-muted w-28 shrink-0">{label}</span>
      {editing ? (
        <div className="flex gap-2 flex-1 min-w-0">
          <input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="ds-input min-h-8 flex-1"
          />
          <button type="button" onClick={save} className="ds-btn ds-btn-secondary ds-btn-sm">
            Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-left text-[14px] text-ds-ink group flex items-center gap-1.5 min-h-8"
        >
          <span className="truncate">{val || <span className="text-ds-muted">Not detected</span>}</span>
          {uncertain && (
            <span className="material-symbols-outlined text-[15px] text-[#D97706]" title="AI is unsure about this field">
              error
            </span>
          )}
          <span className="material-symbols-outlined text-[15px] text-ds-muted opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
            edit
          </span>
        </button>
      )}
    </div>
  );
}

function ExtractionCard({
  details,
  onEdit,
  onConfirm,
  creating,
}: {
  details: ExtractedEventDetails;
  onEdit: (field: keyof ExtractedEventDetails, value: string) => void;
  onConfirm: () => void;
  creating?: boolean;
}) {
  const missing = missingForCreate(details);
  const conf = Math.round((details.confidence ?? 0) * 100);
  const confClass =
    conf >= 80
      ? 'bg-ds-success-soft text-ds-success'
      : conf >= 60
        ? 'bg-ds-warning-soft text-ds-warning'
        : 'bg-ds-danger-soft text-ds-danger';
  const isUncertain = (field: string) => details.uncertainFields?.includes(field);

  const rows: { label: string; field: keyof ExtractedEventDetails; value?: string }[] = [
    { label: 'Event name', field: 'name', value: details.name },
    { label: 'Event type', field: 'eventType', value: details.eventType },
    { label: 'Format', field: 'format', value: details.format },
    { label: 'Start date', field: 'startDate', value: details.startDate ?? details.date },
    { label: 'End date', field: 'endDate', value: details.endDate },
    { label: 'Start time', field: 'startTime', value: details.startTime },
    { label: 'End time', field: 'endTime', value: details.endTime },
    { label: 'Timezone', field: 'timezone', value: details.timezone },
    { label: 'Venue', field: 'venue', value: details.venue },
    { label: 'City', field: 'city', value: details.city },
    { label: 'Capacity', field: 'capacity', value: details.capacity?.toString() },
    { label: 'Contact email', field: 'contactEmail', value: details.contactEmail },
  ];

  return (
    <div className="ds-card overflow-hidden">
      <div className="px-4 py-3 border-b border-ds-line flex items-center justify-between gap-3">
        <span className="text-[14px] font-medium text-ds-ink">Event draft</span>
        <span className={`text-[12px] font-medium rounded-md px-2 py-0.5 ${confClass}`}>{conf}% confidence</span>
      </div>

      <div className="flex flex-col">
        {rows.map((row) => (
          // keyed on the value so a row resets when the assistant updates that field
          <ExtractionRow key={`${row.field}:${row.value ?? ''}`} {...row} uncertain={isUncertain(row.field)} onEdit={onEdit} />
        ))}
      </div>

      {details.ticketTypes && details.ticketTypes.length > 0 && (
        <div className="border-t border-ds-line px-4 py-3">
          <p className="text-[13px] text-ds-muted mb-2">Ticket types (add them on the Tickets page of the event after creating it)</p>
          <div className="flex flex-col gap-1.5">
            {details.ticketTypes.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-ds-subtle px-3 py-2">
                <div className="min-w-0">
                  <span className="text-[14px] font-medium text-ds-ink">{t.name}</span>
                  {t.description && <p className="text-[12px] text-ds-muted mt-0.5">{t.description}</p>}
                </div>
                <span className="text-[14px] font-medium text-ds-ink shrink-0">
                  {t.currency} {t.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.uncertainFields && details.uncertainFields.length > 0 && (
        <div className="border-t border-ds-line bg-[#FFFBEB] px-4 py-2.5 text-[13px] text-[#92400E]">
          Double-check <strong className="font-medium">{details.uncertainFields.join(', ')}</strong>. Click any field to edit it.
        </div>
      )}

      <div className="border-t border-ds-line px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ds-muted">
          {missing.length ? `Still needed: ${missing.join(', ')}.` : 'Review, then create the event as a draft.'}
        </p>
        <button type="button" onClick={() => onConfirm()} disabled={missing.length > 0 || creating} className="ds-btn ds-btn-primary ds-btn-sm shrink-0">
          {creating ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="w-7 h-7 flex items-center justify-center rounded-md text-ds-muted hover:text-ds-ink hover:bg-ds-ink/[0.05] transition-colors"
      aria-label={copied ? 'Copied' : 'Copy message'}
      title={copied ? 'Copied' : 'Copy'}
    >
      <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
    </button>
  );
}

function UserEditor({ initial, onCancel, onSubmit }: { initial: string; onCancel: () => void; onSubmit: (text: string) => void }) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, []);
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [text]);
  const submit = () => text.trim() && onSubmit(text.trim());
  return (
    <div className="w-full max-w-[85%] rounded-2xl border border-ds-line-strong bg-white p-2 shadow-ds-card">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') onCancel();
        }}
        rows={1}
        aria-label="Edit your message"
        className="block w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-ds-ink focus:outline-none"
      />
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="ds-btn ds-btn-ghost ds-btn-sm">Cancel</button>
        <button type="button" onClick={submit} disabled={!text.trim()} className="ds-btn ds-btn-primary ds-btn-sm">Send</button>
      </div>
    </div>
  );
}

function Message({
  message,
  onEdit,
  onConfirm,
  creating,
  isLatest,
  busy,
  followUps,
  onFollowUp,
  onRegenerate,
  onEditMessage,
}: {
  message: UiMessage;
  onEdit: (field: keyof ExtractedEventDetails, value: string) => void;
  onConfirm: () => void;
  creating?: boolean;
  /** Last message in the chat: gets Regenerate and the follow-up chips */
  isLatest: boolean;
  busy: boolean;
  followUps: FollowUp[];
  onFollowUp: (f: FollowUp) => void;
  onRegenerate: () => void;
  onEditMessage: (id: string, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (message.role === 'user') {
    if (editing) {
      return (
        <div className="flex flex-col items-end">
          <UserEditor
            initial={message.content}
            onCancel={() => setEditing(false)}
            onSubmit={(text) => {
              setEditing(false);
              onEditMessage(message.id, text);
            }}
          />
        </div>
      );
    }
    return (
      <div className="group flex flex-col items-end gap-1" title={formatTime(message.timestamp)}>
        {message.attachment ? (
          <div className="flex items-center gap-3 rounded-xl border border-ds-line bg-white p-2 pr-4 shadow-ds-card max-w-[85%]">
            {message.attachment.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.attachment.url}
                alt="Uploaded event flyer"
                className="w-12 h-12 rounded-lg object-cover border border-ds-line"
              />
            ) : (
              // Reopened from history: the image itself is not stored, only its name.
              <span className="w-12 h-12 shrink-0 rounded-lg border border-ds-line bg-ds-subtle flex items-center justify-center text-ds-muted">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">image</span>
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ds-ink truncate">{message.attachment.name}</p>
              <p className="text-[12px] text-ds-muted">Event flyer</p>
            </div>
          </div>
        ) : (
          <div className="agent-msg-in max-w-[80%] rounded-[20px] rounded-br-md bg-ds-accent-soft px-4 py-2.5 text-[15px] leading-relaxed text-ds-ink whitespace-pre-wrap break-words ring-1 ring-ds-accent/10">
            {message.content}
          </div>
        )}
        {!message.attachment && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <CopyButton text={message.content} />
            <IconAction icon="edit" label="Edit message" onClick={() => setEditing(true)} disabled={busy} />
          </div>
        )}
      </div>
    );
  }

  const done = !message.streaming;
  return (
    <div className="agent-msg-in group flex gap-3.5" title={formatTime(message.timestamp)}>
      <AgentAvatar active={message.streaming} />
      <div className="min-w-0 flex-1 pt-[3px]">
        {message.content ? (
          <div className={`text-[15px] leading-7 text-ds-ink space-y-3 break-words ${message.streaming ? 'agent-streaming' : ''}`}>
            {renderMarkdown(message.content)}
          </div>
        ) : (
          <div className="flex h-7 items-center"><TypingDots /></div>
        )}
        {message.stopped && (
          <p className="mt-1 text-[12px] text-ds-muted">Stopped. Send another message or regenerate the reply.</p>
        )}
        {message.extraction && done && (
          <div className="mt-4 agent-msg-in">
            <ExtractionCard details={message.extraction} onEdit={onEdit} onConfirm={onConfirm} creating={creating} />
          </div>
        )}
        {done && (
          <div className={`mt-1.5 flex items-center gap-0.5 transition-opacity ${isLatest ? '' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
            <CopyButton text={message.content} />
            {isLatest && <IconAction icon="refresh" label="Regenerate reply" onClick={onRegenerate} disabled={busy} />}
          </div>
        )}
        {isLatest && done && !busy && followUps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 agent-msg-in">
            {followUps.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => onFollowUp(f)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  f.kind === 'create'
                    ? 'border-ds-accent/40 bg-ds-accent-soft text-ds-accent-strong hover:bg-ds-accent/15'
                    : 'border-ds-line bg-white text-ds-body hover:bg-ds-subtle hover:text-ds-ink'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── main page ───────────────────────── */

export default function AgentPage() {
  const { currentUser, createEvent, activeWorkspace } = useAppContext();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState<ConversationStage>('idle');
  const [extractedDetails, setExtractedDetails] = useState<ExtractedEventDetails | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<{ name: string; url: string } | null>(null);
  const [flyerDataUri, setFlyerDataUri] = useState<string | null>(null);
  const [flyerImages, setFlyerImages] = useState<FlyerImages | null>(null);
  /** True once the server reports no AI provider; flyers and messages are then handled on this device */
  const [localMode, setLocalMode] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  /** Lets a "create it" message create the event with the draft that same turn produced */
  const confirmRef = useRef<(draft?: ExtractedEventDetails) => void>(() => {});
  const [flyerText, setFlyerText] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  /** Cancels the turn in progress (the Stop button and Esc) */
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Chat history ── */
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  /** Mirrors conversationId for async saves, so a slow save never targets a chat you have left */
  const conversationRef = useRef<string | null>(null);
  /** Set when a chat is loaded, so restoring it does not count as an edit to save */
  const skipSaveRef = useRef(false);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  /** Bumped on every switch to another chat; a queued save from an earlier chat sees the change and stops */
  const chatEpoch = useRef(0);
  /** Lets the mount effect open a chat with the handler defined further down */
  const openChatRef = useRef<(id: string) => void>(() => {});

  const firstName = currentUser?.name?.trim().split(/\s+/)[0];
  const isEmpty = messages.length === 0 && !isTyping && !loadingChat;

  const upsertSummary = useCallback((s: ConversationSummary) => {
    setHistory((prev) => [s, ...prev.filter((c) => c.id !== s.id)]);
  }, []);

  const historyFailed = useCallback((err: unknown) => {
    if (isHistoryUnavailable(err)) setHistoryUnavailable(true);
    else console.warn('Chat history error:', err);
  }, []);

  // Load the list, and the chat named in the address bar if any.
  useEffect(() => {
    let cancelled = false;
    agentConversationsService
      .list()
      .then((items) => !cancelled && setHistory(items))
      .catch(historyFailed)
      .finally(() => !cancelled && setHistoryLoading(false));
    const id = new URLSearchParams(window.location.search).get('c');
    if (id) openChatRef.current(id);
    return () => {
      cancelled = true;
    };
  }, [historyFailed]);

  // Save a moment after the chat changes. The first save creates the row; later ones update it.
  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (historyUnavailable || isTyping || !messages.length) return;
    const t = window.setTimeout(() => {
      const epoch = chatEpoch.current;
      const payload = {
        title: conversationTitle(messages, extractedDetails),
        messages: toStored(messages),
        draft: extractedDetails,
        flyer_text: flyerText,
      };
      saveChain.current = saveChain.current
        .then(async () => {
          // Switched to another chat (or a new one) while this was queued.
          if (chatEpoch.current !== epoch) return;
          // Read the id now, not when queued: an earlier save in the chain may have just created the row.
          const id = conversationRef.current;
          if (id) {
            upsertSummary(await agentConversationsService.update(id, payload));
          } else {
            const created = await agentConversationsService.create({ ...payload, workspace_id: activeWorkspace?.id ?? null });
            if (chatEpoch.current !== epoch) return;
            conversationRef.current = created.id;
            setConversationId(created.id);
            setChatUrl(created.id);
            upsertSummary(created);
          }
        })
        .catch(historyFailed);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [messages, extractedDetails, flyerText, isTyping, historyUnavailable, activeWorkspace?.id, upsertSummary, historyFailed]);

  /* Follow the reply while it is written, unless the organizer has scrolled up to read */
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    pinnedRef.current = pinned;
    setShowJump(!pinned);
  };
  const jumpToBottom = () => {
    pinnedRef.current = true;
    setShowJump(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const streamingNow = messages.some((m) => m.streaming);
  useEffect(() => {
    if (!pinnedRef.current) return;
    // Instant while text streams in (smooth scrolling lags behind), smooth otherwise.
    bottomRef.current?.scrollIntoView({ behavior: streamingNow ? 'auto' : 'smooth', block: 'end' });
  }, [messages, isTyping, streamingNow]);
  // Sending a message always brings the conversation back to the bottom.
  const lastUserId = [...messages].reverse().find((m) => m.role === 'user')?.id;
  useEffect(() => {
    if (!lastUserId) return;
    pinnedRef.current = true; // onScroll hides the jump button once we reach the bottom
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lastUserId]);

  /* Esc stops a reply in progress */
  useEffect(() => {
    if (!isTyping) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') abortRef.current?.abort();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTyping]);

  // Grow the composer with its content, up to a cap
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const push = useCallback((msg: UiMessage) => {
    startTransition(() => {
      setMessages((prev) => [...prev, msg]);
    });
  }, []);

  const [readingFlyer, setReadingFlyer] = useState(false);

  const patchMessage = useCallback((id: string, patch: (m: UiMessage) => Partial<UiMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)));
  }, []);

  const stopTurn = useCallback(() => abortRef.current?.abort(), []);

  /**
   * Runs one assistant turn. The reply appears as it is written: streamed from the server for chat
   * turns, written out progressively for flyer reads and on-device answers. The draft card follows
   * the newest reply only, and shows once the reply has finished.
   */
  const runTurn = useCallback(
    async (history: UiMessage[], flyer: FlyerInput) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;
      setIsTyping(true);
      setReadingFlyer(!!flyer?.extract);

      const replyId = uid();
      let shown = false;
      const showReply = () => {
        if (shown) return;
        shown = true;
        setMessages((prev) => [...prev, assistantMsg('', { id: replyId, streaming: true })]);
      };
      const onDelta = (text: string) => {
        showReply();
        patchMessage(replyId, (m) => ({ content: m.content + text }));
      };

      // Without an AI provider the flyer is read on this device with OCR and rules.
      const runLocally = async () => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const today = new Date().toLocaleDateString('en-CA', { timeZone });
        if (flyer?.extract) {
          setOcrProgress(0);
          try {
            const lines = await readFlyerText(flyer.source.dataUri, setOcrProgress);
            return localFlyerTurn(lines, { today, timeZone, fileName: flyer.source.name });
          } finally {
            setOcrProgress(null);
          }
        }
        const turn = history.filter((m) => m.role === 'user').length - 1;
        return localChatTurn(extractedDetails as Partial<Details> | null, history[history.length - 1].content, { today, timeZone, turn });
      };

      try {
        let turn: AgentTurn & { flyerText?: string; action?: 'create' };
        if (localMode) {
          turn = await runLocally();
        } else {
          try {
            turn = await askAgent(history, extractedDetails, flyer, flyerText, { onDelta, signal });
          } catch (err) {
            if ((err as Error & { code?: string }).code !== 'not_configured') throw err;
            setLocalMode(true);
            turn = await runLocally();
          }
        }
        if (signal.aborted) throw new DOMException('Stopped', 'AbortError');

        // Not streamed (flyer read or on-device): write it out now.
        if (!shown) {
          showReply();
          setReadingFlyer(false);
          await revealText(turn.reply, (text) => patchMessage(replyId, () => ({ content: text })), signal);
          if (signal.aborted) throw new DOMException('Stopped', 'AbortError');
        }

        if (turn.flyerText !== undefined) setFlyerText(turn.flyerText);
        const details = toDetails(turn.details);
        const showCard = hasDraft(details);
        if (showCard) {
          setExtractedDetails(details);
          setStage('reviewing_extraction');
        }
        startTransition(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId
                ? { ...m, content: turn.reply, streaming: false, extraction: showCard ? details : undefined }
                : m.extraction
                  ? { ...m, extraction: undefined }
                  : m,
            ),
          );
        });
        if (turn.action === 'create' && showCard) confirmRef.current(details);
      } catch (err) {
        if (isAbort(err) || signal.aborted) {
          // Keep what was written so far; drop an empty bubble.
          setMessages((prev) =>
            prev.flatMap((m) => (m.id !== replyId ? [m] : m.content ? [{ ...m, streaming: false, stopped: true }] : [])),
          );
        } else {
          const message = (err as Error).message || 'The flyer could not be read. Try again, or describe the event in a message.';
          if (shown) patchMessage(replyId, () => ({ content: message, streaming: false }));
          else push(assistantMsg(message));
        }
        setStage((current) => (current === 'extracting' ? 'idle' : current));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setReadingFlyer(false);
        setIsTyping(false);
      }
    },
    [extractedDetails, push, localMode, flyerText, patchMessage],
  );

  /** What to send about the flyer when re-running from a user message */
  const flyerFor = useCallback(
    (message: UiMessage | undefined): FlyerInput =>
      flyerImages && flyerPreview
        ? {
            images: flyerImages,
            extract: !!message?.attachment,
            text: message?.attachment ? null : flyerText,
            source: { dataUri: flyerPreview.url, name: flyerPreview.name },
          }
        : null,
    [flyerImages, flyerPreview, flyerText],
  );

  /** Drops the latest reply and asks again from the last thing the organizer said. */
  const handleRegenerate = useCallback(() => {
    if (isTyping) return;
    let lastUser = -1;
    messages.forEach((m, i) => {
      if (m.role === 'user') lastUser = i;
    });
    if (lastUser < 0) return;
    const kept = messages.slice(0, lastUser + 1);
    setMessages(kept);
    void runTurn(kept, flyerFor(kept[lastUser]));
  }, [isTyping, messages, runTurn, flyerFor]);

  /** Replaces a message the organizer sent, drops everything after it, and asks again. */
  const handleEditMessage = useCallback(
    (id: string, text: string) => {
      if (isTyping) return;
      const index = messages.findIndex((m) => m.id === id);
      if (index < 0) return;
      const kept = [...messages.slice(0, index), userMsg(text)];
      setMessages(kept);
      void runTurn(kept, flyerFor(undefined));
    },
    [isTyping, messages, runTurn, flyerFor],
  );

  /* Handle flyer upload */
  const handleFlyerFile = useCallback((file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      push(assistantMsg('I can read PNG, JPG, WEBP or GIF flyers. Upload one of those, or describe the event in a message.'));
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      push(assistantMsg('That image is larger than 25 MB. Upload a smaller copy of the flyer.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      let dataUri = e.target?.result as string;
      let images: FlyerImages;
      try {
        images = await prepareFlyer(dataUri);
      } catch (err) {
        push(assistantMsg((err as Error).message));
        return;
      }
      // Big screenshots and photos are kept as the compressed copy, which fits the 5 MB upload limit
      if (file.size > 5 * 1024 * 1024) dataUri = images.main;
      setFlyerDataUri(dataUri);
      setFlyerImages(images);
      setFlyerText(null);
      setFlyerPreview({ name: file.name, url: dataUri });
      setStage('extracting');

      const msg = userMsg(`Here is the flyer for my event (${file.name}). Fill in the draft from it.`, {
        attachment: { name: file.name, url: dataUri },
      });
      push(msg);
      await runTurn([...messages, msg], { images, extract: true, text: null, source: { dataUri, name: file.name } });
    };
    reader.readAsDataURL(file);
  }, [push, messages, runTurn]);

  /* Paste a flyer (a screenshot or a copied image) anywhere on the page */
  const pasteRef = useRef<{ onFile: (f: File) => void; busy: boolean }>({ onFile: handleFlyerFile, busy: isTyping });
  useEffect(() => {
    pasteRef.current = { onFile: handleFlyerFile, busy: isTyping };
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (!file) return; // plain text pastes into the message box as usual
      e.preventDefault();
      if (pasteRef.current.busy) return;
      const ext = file.type.split('/')[1] || 'png';
      const named = file.name && file.name !== `image.${ext}` ? file : new File([file], `Pasted flyer.${ext}`, { type: file.type });
      pasteRef.current.onFile(named);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  /* Handle text send */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    const msg = userMsg(text);
    push(msg);
    await runTurn(
      [...messages, msg],
      flyerImages && flyerPreview
        ? { images: flyerImages, extract: false, text: flyerText, source: { dataUri: flyerPreview.url, name: flyerPreview.name } }
        : null,
    );
  }, [input, isTyping, push, messages, runTurn, flyerImages, flyerText, flyerPreview]);

  /* Handle inline field edit */
  const handleFieldEdit = useCallback((field: keyof ExtractedEventDetails, value: string) => {
    setExtractedDetails((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
    setMessages((prev) =>
      prev.map((m) =>
        m.extraction ? { ...m, extraction: { ...m.extraction, [field]: value } } : m,
      ),
    );
  }, []);

  /* Create the event from the reviewed draft, the same way the classic builder does */
  const handleConfirm = useCallback(async (draft?: ExtractedEventDetails) => {
    const d = draft ?? extractedDetails;
    if (!d || creating) return;
    const missing = missingForCreate(d);
    if (missing.length) {
      push(assistantMsg(`Before I can create it, the draft still needs: ${missing.join(', ')}. Tell me, or click a field to fill it in.`));
      return;
    }
    if (activeWorkspace?.is_suspended) {
      push(assistantMsg('This workspace is suspended, so new events cannot be created. Contact support to reactivate it.'));
      return;
    }
    setCreating(true);
    setStage('creating_event');
    try {
      const startDate = (d.startDate || d.date)!;
      const endDate = d.endDate || startDate;
      if (endDate < startDate || (endDate === startDate && d.endTime! <= d.startTime!)) {
        throw new Error('The end is before the start. Fix the end date or time, then try again.');
      }
      const flyer = flyerDataUri ? await uploadFlyer(flyerDataUri) : undefined;
      const location = [d.venue, d.city].filter(Boolean).join(', ');
      const created = await createEvent({
        name: d.name!.trim(),
        slug: buildEventSlug(d.name!),
        type: d.eventType!,
        format: d.format!,
        startDate,
        endDate,
        startTime: d.startTime!,
        endTime: d.endTime!,
        timezone: d.timezone || 'Asia/Kolkata',
        location: d.format === 'Virtual' ? '' : location,
        description: d.description?.trim() || '',
        status: 'draft',
        flyer,
        website: buildDefaultWebsite({ flyerUrl: flyer, format: d.format! }),
      });
      setStage('done');
      const chatId = conversationRef.current;
      if (chatId) {
        agentConversationsService
          .update(chatId, { created_event_id: created.id })
          .then(upsertSummary)
          .catch(historyFailed);
      }
      setMessages((prev) => prev.map((m) => (m.extraction ? { ...m, extraction: undefined } : m)));
      push(
        assistantMsg(
          `**${created.name}** is created as a draft${
            flyer ? ' with your flyer as the website banner' : flyerDataUri ? '. The flyer could not be attached, so add it later in the website builder' : ''
          }. Opening the event workspace, where you can add tickets and publish the website.`,
        ),
      );
      setExtractedDetails(null);
      setFlyerPreview(null);
      setFlyerDataUri(null);
      setFlyerImages(null);
      setFlyerText(null);
      router.push(`/app/events/${created.id}`);
    } catch (err) {
      const raw = (err as Error)?.message || '';
      const internal = /supabase|postgres|sql|relation|foreign key|syntax error|uuid|column|table|database/i.test(raw);
      push(assistantMsg(internal || !raw ? 'The event could not be created. Check the details and try again.' : raw));
      setStage('reviewing_extraction');
    } finally {
      setCreating(false);
    }
  }, [extractedDetails, creating, push, activeWorkspace, flyerDataUri, createEvent, router, upsertSummary, historyFailed]);

  useEffect(() => {
    confirmRef.current = handleConfirm;
  });

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setIsTyping(false);
    setStage('idle');
    setExtractedDetails(null);
    setFlyerPreview(null);
    setFlyerDataUri(null);
    setFlyerImages(null);
    setFlyerText(null);
  };

  const handleNewChat = () => {
    chatEpoch.current += 1;
    conversationRef.current = null;
    setConversationId(null);
    setChatUrl(null);
    resetChat();
    textareaRef.current?.focus();
  };

  /* Reopen a saved chat: messages, the draft card and the flyer's text come back; the image does not. */
  const openChat = async (id: string) => {
    if (id === conversationRef.current || isTyping) return;
    chatEpoch.current += 1;
    conversationRef.current = id;
    setConversationId(id);
    setChatUrl(id);
    setLoadingChat(true);
    resetChat();
    try {
      const chat = await agentConversationsService.get(id);
      if (conversationRef.current !== id) return; // another chat was picked meanwhile
      if (!chat) {
        handleNewChat();
        push(assistantMsg('That chat could not be found. It may have been deleted.'));
        return;
      }
      skipSaveRef.current = true;
      const restored = fromStored(chat.messages);
      setMessages(restored);
      setExtractedDetails(chat.draft);
      setFlyerText(chat.flyer_text);
      setStage(chat.created_event_id ? 'done' : chat.draft ? 'reviewing_extraction' : 'idle');
    } catch (err) {
      historyFailed(err);
      push(assistantMsg('That chat could not be opened. Try again in a moment.'));
    } finally {
      setLoadingChat(false);
    }
  };
  useEffect(() => {
    openChatRef.current = openChat;
  });

  const deleteChat = async (id: string) => {
    // The history panel asks "Delete this chat?" inline before calling this.
    try {
      await agentConversationsService.remove(id);
      setHistory((prev) => prev.filter((c) => c.id !== id));
      if (id === conversationRef.current) handleNewChat();
    } catch (err) {
      historyFailed(err);
      window.alert('The chat could not be deleted. Try again in a moment.');
    }
  };

  const handleFollowUp = (f: FollowUp) => {
    if (f.kind === 'create') return void handleConfirm();
    if (f.kind === 'upload') return fileInputRef.current?.click();
    if (f.kind === 'send') {
      if (isTyping) return;
      const msg = userMsg(f.text);
      push(msg);
      void runTurn([...messages, msg], flyerFor(undefined));
      return;
    }
    // Start the sentence in the composer so the organizer only types the answer.
    setInput(f.text);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(f.text.length, f.text.length);
    });
  };
  const followUps = stage === 'done' || creating ? [] : followUpsFor(extractedDetails);
  const lastId = messages[messages.length - 1]?.id;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const composer = (
    <div className="w-full">
      <div className="rounded-[20px] border border-ds-line-strong bg-white shadow-[0_2px_10px_rgba(17,17,19,0.05)] transition-shadow focus-within:shadow-[0_4px_18px_rgba(17,17,19,0.08)]">
        {flyerPreview && (
          <div className="px-3 pt-3">
            <div className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-ds-line bg-ds-subtle p-1.5 pr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flyerPreview.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-ds-ink truncate max-w-[180px]">{flyerPreview.name}</p>
                <p className="text-[11px] text-ds-muted">{stage === 'extracting' ? 'Analyzing…' : 'Analyzed'}</p>
              </div>
              <button
                type="button"
                onClick={() => { setFlyerPreview(null); setFlyerDataUri(null); setFlyerImages(null); setFlyerText(null); }}
                className="ml-1 w-6 h-6 flex items-center justify-center rounded-md text-ds-muted hover:text-ds-ink hover:bg-ds-ink/[0.05]"
                aria-label="Remove flyer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          id="agent-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isEmpty ? 'Describe your event, or paste or upload a flyer…' : 'Reply to AI Event Agent…'}
          rows={1}
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed text-ds-ink placeholder:text-ds-muted focus:outline-none"
          style={{ scrollbarWidth: 'thin' }}
          aria-label="Message AI Event Agent"
          autoFocus
        />

        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
          <button
            type="button"
            id="agent-attach-flyer"
            onClick={() => fileInputRef.current?.click()}
            title="Upload event flyer"
            aria-label="Upload event flyer"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-ds-line text-ds-body hover:bg-ds-subtle hover:text-ds-ink transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[12px] text-ds-muted">
              {isTyping ? 'Esc to stop' : 'Enter to send, Shift+Enter for a new line'}
            </span>
            {isTyping ? (
              <button
                type="button"
                id="agent-stop"
                onClick={stopTurn}
                aria-label="Stop generating"
                title="Stop generating"
                className="w-8 h-8 rounded-lg bg-ds-ink text-white flex items-center justify-center hover:bg-ds-ink/80 transition-colors"
              >
                <span className="block h-2.5 w-2.5 rounded-[2px] bg-white" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                id="agent-send-message"
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send message"
                className="w-8 h-8 rounded-lg bg-ds-accent text-white flex items-center justify-center hover:bg-ds-accent-strong transition-colors disabled:bg-ds-accent/35 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFlyerFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );

  return (
    <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full">
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <AgentHistoryPanel
          items={history}
          activeId={conversationId}
          loading={historyLoading}
          unavailable={historyUnavailable}
          onSelect={openChat}
          onNew={handleNewChat}
          onDelete={deleteChat}
          mobileOpen={mobileHistoryOpen}
          onMobileClose={() => setMobileHistoryOpen(false)}
          collapsed={historyCollapsed}
        />

        <main
          className="relative flex-1 min-w-0 flex flex-col h-dvh bg-white"
          onDragEnter={(e) => {
            if (e.dataTransfer.types.includes('Files')) setDragging(true);
          }}
        >
          {/* Top bar */}
          <header className="h-14 shrink-0 flex items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-ds-muted hover:bg-ds-subtle hover:text-ds-ink"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <button
              type="button"
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-ds-muted hover:bg-ds-subtle hover:text-ds-ink"
              onClick={() => setMobileHistoryOpen(true)}
              aria-label="Open chat history"
              title="Chats"
            >
              <span className="material-symbols-outlined text-[21px]">history</span>
            </button>
            <button
              type="button"
              className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg text-ds-muted hover:bg-ds-subtle hover:text-ds-ink"
              onClick={() => setHistoryCollapsed((c) => !c)}
              aria-label={historyCollapsed ? 'Show chat history' : 'Hide chat history'}
              aria-pressed={!historyCollapsed}
              title={historyCollapsed ? 'Show chats' : 'Hide chats'}
            >
              <span className="material-symbols-outlined text-[21px]">{historyCollapsed ? 'left_panel_open' : 'left_panel_close'}</span>
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-[15px] font-medium text-ds-ink truncate">
                {(conversationId && history.find((c) => c.id === conversationId)?.title) || 'AI Event Agent'}
              </h1>
              {localMode && (
                <span
                  className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-ds-warning-soft px-2 py-0.5 text-[11.5px] font-medium text-ds-warning"
                  title="The full AI assistant isn't available right now, so replies are simpler and flyers are read on this device."
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">bolt</span>
                  Basic mode
                </span>
              )}
            </div>
            <Link href="/app/events/new" className="ds-btn ds-btn-ghost ds-btn-sm hidden sm:inline-flex">
              Classic builder
            </Link>
            {!isEmpty && (
              <button type="button" onClick={handleNewChat} className="ds-btn ds-btn-secondary ds-btn-sm">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">edit_square</span>
                New chat
              </button>
            )}
          </header>

          {isEmpty ? (
            /* Welcome state: greeting and composer centered on the page */
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 pb-[12vh]">
              <div className="w-full max-w-2xl">
                <div className="flex items-center justify-center gap-3 mb-8">
                  <AgentMark className="text-[32px]" />
                  <h2 className="text-[28px] sm:text-[36px] font-normal tracking-tight text-ds-ink">
                    {getGreeting()}{firstName ? `, ${firstName}` : ''}
                  </h2>
                </div>
                {composer}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        if (s.prompt === null) {
                          fileInputRef.current?.click();
                        } else {
                          setInput(s.prompt);
                          textareaRef.current?.focus();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ds-line bg-white px-3 py-1.5 text-[13px] text-ds-body hover:bg-ds-subtle hover:text-ds-ink transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-ds-muted" aria-hidden="true">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation */}
              <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-6 pb-12 flex flex-col gap-6">
                  {loadingChat && (
                    <div className="flex items-center gap-2 py-10 text-[14px] text-ds-muted" role="status">
                      <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
                      Opening chat…
                    </div>
                  )}
                  {messages.map((msg) => (
                    <Message
                      key={msg.id}
                      message={msg}
                      onEdit={handleFieldEdit}
                      onConfirm={handleConfirm}
                      creating={creating}
                      isLatest={msg.id === lastId}
                      busy={isTyping || creating}
                      followUps={followUps}
                      onFollowUp={handleFollowUp}
                      onRegenerate={handleRegenerate}
                      onEditMessage={handleEditMessage}
                    />
                  ))}
                  {isTyping && !streamingNow && <ThinkingIndicator ocrProgress={ocrProgress} readingFlyer={readingFlyer} />}
                  <div ref={bottomRef} className="h-px" />
                </div>
              </div>

              {/* Composer docked at the bottom */}
              <div className="relative shrink-0 px-4 sm:px-6 pb-3">
                {showJump && (
                  <button
                    type="button"
                    onClick={jumpToBottom}
                    aria-label="Scroll to the latest message"
                    className="agent-msg-in absolute -top-12 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full border border-ds-line bg-white text-ds-body shadow-[0_2px_10px_rgba(17,17,19,0.12)] flex items-center justify-center hover:text-ds-ink"
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_downward</span>
                  </button>
                )}
                <div className="mx-auto w-full max-w-3xl">
                  {composer}
                  <p className="text-[11px] text-ds-muted mt-2 text-center">
                    The assistant can misread flyers. Check every field before creating the event.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Drag-and-drop overlay */}
          {dragging && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 p-6"
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFlyerFile(f);
              }}
            >
              <div className="pointer-events-none flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ds-accent/50 bg-ds-accent-soft px-12 py-10 text-center">
                <span className="material-symbols-outlined text-[32px] text-ds-accent">upload_file</span>
                <p className="text-[15px] font-medium text-ds-ink">Drop your flyer to analyze it</p>
                <p className="text-[13px] text-ds-muted">PNG, JPG or WEBP. You can also paste an image with Ctrl+V.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
