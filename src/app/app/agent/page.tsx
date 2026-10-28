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
import type {
  ChatMessage,
  ConversationStage,
  ExtractedEventDetails,
} from '@/lib/ai/types';

/* ─────────────────────────── helpers ─────────────────────────── */

type UiMessage = ChatMessage & {
  /** Flyer attached to a user message, rendered as a thumbnail card */
  attachment?: { name: string; url: string };
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

/** Sends the conversation to the server route, which calls the model and returns a reply plus the full draft. */
async function askAgent(history: UiMessage[], draft: ExtractedEventDetails | null, image: string | null) {
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      draft,
      image,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || 'The assistant is unavailable right now. Try again in a few minutes.');
    (err as Error & { code?: string }).code = json.code;
    throw err;
  }
  return json as AgentTurn;
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

async function uploadFlyer(dataUri: string) {
  const blob = await (await fetch(dataUri)).blob();
  const form = new FormData();
  form.append('file', blob, `flyer.${blob.type.split('/')[1] || 'png'}`);
  const res = await fetch('/api/events/flyer-upload', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  return res.ok && json.url ? (json.url as string) : undefined;
}

const SUGGESTIONS = [
  { icon: 'upload_file', label: 'Upload an event flyer', prompt: null },
  { icon: 'mic', label: 'Tech conference', prompt: 'Tech conference in Hyderabad, Dec 2026, around 500 attendees' },
  { icon: 'directions_walk', label: 'Charity walkathon', prompt: 'Charity walkathon in Bengaluru next March, free registration' },
  { icon: 'school', label: 'Workshop', prompt: 'Two-day design workshop for 40 people with paid tickets' },
] as const;

/* Minimal markdown: paragraphs, "- " bullet lists, **bold** and *italic* */
function renderInline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

function renderMarkdown(text: string) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 marker:text-ds-muted">
        {items.map((item, i) => <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>)}
      </ul>,
    );
    list = [];
  };

  text.split('\n').forEach((line) => {
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();
    if (line.trim()) {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line, `p-${blocks.length}`)}</p>);
    }
  });
  flushList();
  return blocks;
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

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <AgentMark className="text-[22px] animate-pulse" />
      <span className="text-[14px] text-ds-muted">Thinking…</span>
    </div>
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
        <button type="button" onClick={onConfirm} disabled={missing.length > 0 || creating} className="ds-btn ds-btn-primary ds-btn-sm shrink-0">
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

function Message({
  message,
  onEdit,
  onConfirm,
  creating,
}: {
  message: UiMessage;
  onEdit: (field: keyof ExtractedEventDetails, value: string) => void;
  onConfirm: () => void;
  creating?: boolean;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-2" title={formatTime(message.timestamp)}>
        {message.attachment ? (
          <div className="flex items-center gap-3 rounded-xl border border-ds-line bg-white p-2 pr-4 shadow-ds-card max-w-[85%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachment.url}
              alt="Uploaded event flyer"
              className="w-12 h-12 rounded-lg object-cover border border-ds-line"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ds-ink truncate">{message.attachment.name}</p>
              <p className="text-[12px] text-ds-muted">Event flyer</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[85%] rounded-2xl bg-ds-ink/[0.05] px-4 py-2.5 text-[15px] leading-relaxed text-ds-ink whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group flex gap-3.5" title={formatTime(message.timestamp)}>
      <AgentMark className="text-[22px] mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-7 text-ds-ink space-y-3 break-words">
          {renderMarkdown(message.content)}
        </div>
        {message.extraction && (
          <div className="mt-4">
            <ExtractionCard details={message.extraction} onEdit={onEdit} onConfirm={onConfirm} creating={creating} />
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <CopyButton text={message.content} />
        </div>
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
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = currentUser?.name?.trim().split(/\s+/)[0];
  const isEmpty = messages.length === 0 && !isTyping;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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

  /** Runs one assistant turn and shows the reply; the draft card follows the newest reply only. */
  const runTurn = useCallback(
    async (history: UiMessage[], image: string | null) => {
      setIsTyping(true);
      try {
        const turn = await askAgent(history, extractedDetails, image);
        const details = toDetails(turn.details);
        const showCard = hasDraft(details);
        if (showCard) {
          setExtractedDetails(details);
          setStage('reviewing_extraction');
        }
        startTransition(() => {
          setMessages((prev) => [
            ...prev.map((m) => (m.extraction ? { ...m, extraction: undefined } : m)),
            assistantMsg(turn.reply, showCard ? { extraction: details } : undefined),
          ]);
        });
      } catch (err) {
        const e = err as Error & { code?: string };
        push(
          assistantMsg(
            e.code === 'not_configured'
              ? `${e.message}\n\nUse the **classic builder** (top right) to create your event now.`
              : e.message,
          ),
        );
        setStage((current) => (current === 'extracting' ? 'idle' : current));
      } finally {
        setIsTyping(false);
      }
    },
    [extractedDetails, push],
  );

  /* Handle flyer upload */
  const handleFlyerFile = useCallback((file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      push(assistantMsg('I can read PNG, JPG, WEBP or GIF flyers. Upload one of those, or describe the event in a message.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      push(assistantMsg('That flyer is larger than 5 MB. Upload a smaller image.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      setFlyerDataUri(dataUri);
      setFlyerPreview({ name: file.name, url: dataUri });
      setStage('extracting');

      const msg = userMsg(`Here is the flyer for my event (${file.name}). Fill in the draft from it.`, {
        attachment: { name: file.name, url: dataUri },
      });
      push(msg);
      await runTurn([...messages, msg], dataUri);
    };
    reader.readAsDataURL(file);
  }, [push, messages, runTurn]);

  /* Handle text send */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    const msg = userMsg(text);
    push(msg);
    await runTurn([...messages, msg], flyerDataUri);
  }, [input, isTyping, push, messages, runTurn, flyerDataUri]);

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
  const handleConfirm = useCallback(async () => {
    const d = extractedDetails;
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
      setMessages((prev) => prev.map((m) => (m.extraction ? { ...m, extraction: undefined } : m)));
      push(
        assistantMsg(
          `**${created.name}** is created as a draft${flyer ? ' with your flyer as the website banner' : ''}. Opening the event workspace, where you can add tickets and publish the website.`,
        ),
      );
      setExtractedDetails(null);
      setFlyerPreview(null);
      setFlyerDataUri(null);
      router.push(`/app/events/${created.id}`);
    } catch (err) {
      const raw = (err as Error)?.message || '';
      const internal = /supabase|postgres|sql|relation|foreign key|syntax error|uuid|column|table|database/i.test(raw);
      push(assistantMsg(internal || !raw ? 'The event could not be created. Check the details and try again.' : raw));
      setStage('reviewing_extraction');
    } finally {
      setCreating(false);
    }
  }, [extractedDetails, creating, push, activeWorkspace, flyerDataUri, createEvent, router]);

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setIsTyping(false);
    setStage('idle');
    setExtractedDetails(null);
    setFlyerPreview(null);
    setFlyerDataUri(null);
    textareaRef.current?.focus();
  };

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
                onClick={() => { setFlyerPreview(null); setFlyerDataUri(null); }}
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
          placeholder={isEmpty ? 'Describe your event, or upload a flyer…' : 'Reply to AI Event Agent…'}
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
            <span className="hidden sm:inline text-[12px] text-ds-muted">Event assistant</span>
            <button
              type="button"
              id="agent-send-message"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
              className="w-8 h-8 rounded-lg bg-ds-accent text-white flex items-center justify-center hover:bg-ds-accent-strong transition-colors disabled:bg-ds-accent/35 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </button>
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
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-[15px] font-medium text-ds-ink truncate">AI Event Agent</h1>
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
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-4 pb-10 flex flex-col gap-7">
                  {messages.map((msg) => (
                    <Message
                      key={msg.id}
                      message={msg}
                      onEdit={handleFieldEdit}
                      onConfirm={handleConfirm}
                      creating={creating}
                    />
                  ))}
                  {isTyping && <ThinkingIndicator />}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Composer docked at the bottom */}
              <div className="shrink-0 px-4 sm:px-6 pb-3">
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
                <p className="text-[13px] text-ds-muted">PNG, JPG or WEBP, up to 5 MB</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
