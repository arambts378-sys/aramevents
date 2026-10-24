'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useTransition,
} from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { mockAIAdapter } from '@/lib/ai/mockAdapter';
import type {
  ChatMessage,
  ConversationContext,
  ConversationStage,
  ExtractedEventDetails,
} from '@/lib/ai/types';

/* ─────────────────────────── helpers ─────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function assistantMsg(content: string, extra?: Partial<ChatMessage>): ChatMessage {
  return { id: uid(), role: 'assistant', content, timestamp: new Date(), ...extra };
}

function userMsg(content: string): ChatMessage {
  return { id: uid(), role: 'user', content, timestamp: new Date() };
}

const INITIAL_MSG: ChatMessage = assistantMsg(
  "👋 Hi! I'm your **AI Event Agent** for ARAM BTS.\n\nI can help you create an event in minutes — just upload your event flyer and I'll extract all the details automatically, or describe your event in a few words and we'll build it together.\n\n**To get started:**\n- 📎 Upload a flyer image using the attachment button below\n- 💬 Or type a description like *\"Tech conference in Hyderabad, Dec 2026\"*",
);

/* ─────────────────────────── sub-components ──────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 justify-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center shrink-0 shadow-sm">
        <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
      </div>
      <div className="bg-white border border-[#E6E2F0] rounded-2xl rounded-bl-sm px-4 py-3 shadow-xs">
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[#7C5CFC]/40 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(text: string) {
  // Minimal markdown: bold, newlines
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
}

/* Extraction Review Card */
function ExtractionCard({
  details,
  onEdit,
  onConfirm,
}: {
  details: ExtractedEventDetails;
  onEdit: (field: keyof ExtractedEventDetails, value: string) => void;
  onConfirm: () => void;
}) {
  const conf = Math.round(details.confidence * 100);
  const confColor =
    conf >= 80 ? 'text-[#10B981]' : conf >= 60 ? 'text-[#F59E0B]' : 'text-[#F43F5E]';

  const Row = ({
    label,
    field,
    value,
    uncertain,
  }: {
    label: string;
    field: keyof ExtractedEventDetails;
    value?: string;
    uncertain?: boolean;
  }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (editing) inputRef.current?.focus();
    }, [editing]);

    return (
      <div
        className={`flex items-start gap-2 py-2 border-b border-[#F0EDF8] last:border-0 ${uncertain ? 'bg-[#FFFBEB] rounded-lg px-2 -mx-2' : ''}`}
      >
        <span className="text-[11px] font-semibold text-[#77738A] uppercase tracking-wide w-28 shrink-0 pt-0.5">
          {label}
        </span>
        {editing ? (
          <div className="flex gap-1.5 flex-1">
            <input
              ref={inputRef}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="flex-1 border border-[#7C5CFC]/40 rounded-md px-2 py-0.5 text-[13px] text-[#17152B] focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            />
            <button
              type="button"
              onClick={() => { onEdit(field, val); setEditing(false); }}
              className="text-[#7C5CFC] text-[12px] font-semibold hover:underline"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-[13px] text-[#17152B] font-medium group flex items-center gap-1"
          >
            <span>{val || <span className="text-[#77738A] italic">Not detected</span>}</span>
            {uncertain && (
              <span className="material-symbols-outlined text-[14px] text-[#F59E0B]" title="AI uncertain about this field">
                warning
              </span>
            )}
            <span className="material-symbols-outlined text-[14px] text-[#7C5CFC] opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
              edit
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#E6E2F0] rounded-2xl shadow-sm overflow-hidden max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7C5CFC]/8 to-[#6366F1]/8 border-b border-[#E6E2F0] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
          </div>
          <span className="text-[13px] font-bold text-[#17152B]">Extracted Event Details</span>
        </div>
        <span className={`text-[12px] font-bold ${confColor}`}>{conf}% confidence</span>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 flex flex-col">
        <Row label="Event Name" field="name" value={details.name} />
        <Row label="Category" field="category" value={details.category} />
        <Row label="Date" field="date" value={details.date} />
        <Row label="End Date" field="endDate" value={details.endDate} />
        <Row label="Start Time" field="startTime" value={details.startTime} />
        <Row
          label="End Time"
          field="endTime"
          value={details.endTime}
          uncertain={details.uncertainFields?.includes('endTime')}
        />
        <Row label="Timezone" field="timezone" value={details.timezone} />
        <Row label="Venue" field="venue" value={details.venue} />
        <Row label="City" field="city" value={details.city} />
        <Row label="Capacity" field="capacity" value={details.capacity?.toString()} />
        <Row label="Contact Email" field="contactEmail" value={details.contactEmail} />
      </div>

      {/* Ticket Types */}
      {details.ticketTypes && details.ticketTypes.length > 0 && (
        <div className="border-t border-[#E6E2F0] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#77738A] mb-2">
            Ticket Types
          </p>
          <div className="flex flex-col gap-1.5">
            {details.ticketTypes.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-[#F7F5FF] rounded-lg px-3 py-2"
              >
                <div>
                  <span className="text-[13px] font-semibold text-[#17152B]">{t.name}</span>
                  {t.description && (
                    <p className="text-[11px] text-[#77738A] mt-0.5">{t.description}</p>
                  )}
                </div>
                <span className="text-[13px] font-bold text-[#7C5CFC]">
                  {t.currency} {t.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uncertain warning */}
      {details.uncertainFields && details.uncertainFields.length > 0 && (
        <div className="border-t border-[#F0EDF8] bg-[#FFFBEB] px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#F59E0B] text-[16px]">warning</span>
          <p className="text-[12px] text-[#92400E]">
            AI is uncertain about: <strong>{details.uncertainFields.join(', ')}</strong>. Click any field to edit.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-[#E6E2F0] px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-[12px] text-[#77738A]">Review carefully before creating the event.</p>
        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] text-white text-[13px] font-bold px-4 py-2 rounded-xl hover:shadow-md hover:scale-[1.02] transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Create Event
        </button>
      </div>
    </div>
  );
}

/* Message Bubble */
function MessageBubble({
  message,
  onEdit,
  onConfirm,
}: {
  message: ChatMessage;
  onEdit?: (field: keyof ExtractedEventDetails, value: string) => void;
  onConfirm?: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
        </div>
      )}

      <div className={`flex flex-col gap-1.5 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-xs ${
            isUser
              ? 'bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] text-white rounded-br-sm'
              : 'bg-white border border-[#E6E2F0] text-[#17152B] rounded-bl-sm'
          }`}
        >
          {renderMarkdown(message.content)}
        </div>

        {/* Extraction card */}
        {message.extraction && onEdit && onConfirm && (
          <div className="w-full mt-1">
            <ExtractionCard
              details={message.extraction}
              onEdit={onEdit}
              onConfirm={onConfirm}
            />
          </div>
        )}

        <span className="text-[10px] text-[#77738A]">{formatTime(message.timestamp)}</span>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center shrink-0 text-[#7C5CFC] font-bold text-[12px]">
          U
        </div>
      )}
    </div>
  );
}

/* Flyer Dropzone */
function FlyerDropzone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    if (file.type.startsWith('image/')) onFile(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all ${
        dragging
          ? 'border-[#7C5CFC] bg-[#F6F1FF]'
          : 'border-[#D9D4F0] bg-[#F7F5FF] hover:border-[#7C5CFC]/50 hover:bg-[#F6F1FF]/60'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload event flyer"
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C5CFC]/15 to-[#6366F1]/15 flex items-center justify-center">
        <span className="material-symbols-outlined text-[#7C5CFC] text-[24px]">upload_file</span>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-[#17152B]">Drop your event flyer here</p>
        <p className="text-[12px] text-[#77738A] mt-0.5">PNG, JPG, or PDF — up to 10 MB</p>
      </div>
      <span className="text-[12px] font-semibold text-[#7C5CFC] border border-[#7C5CFC]/30 rounded-lg px-3 py-1 bg-white hover:bg-[#F6F1FF] transition-colors">
        Browse Files
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
      />
    </div>
  );
}

/* ─────────────────────────── main page ───────────────────────── */

export default function AgentPage() {
  const { currentUser } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState<ConversationStage>('idle');
  const [extractedDetails, setExtractedDetails] = useState<ExtractedEventDetails | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [flyerDataUri, setFlyerDataUri] = useState<string | null>(null);
  const [showDropzone, setShowDropzone] = useState(false);
  const [, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const push = useCallback((msg: ChatMessage) => {
    startTransition(() => {
      setMessages((prev) => [...prev, msg]);
    });
  }, []);

  const buildCtx = useCallback((): ConversationContext => ({
    messages,
    extractedDetails: extractedDetails ?? undefined,
    flyerDataUri: flyerDataUri ?? undefined,
    stage,
  }), [messages, extractedDetails, flyerDataUri, stage]);

  /* Handle flyer upload */
  const handleFlyerFile = useCallback(async (file: File) => {
    setShowDropzone(false);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      setFlyerDataUri(dataUri);
      setFlyerPreview(dataUri);

      push(userMsg(`📎 Uploaded flyer: ${file.name}`));
      setIsTyping(true);
      setStage('extracting');

      push(assistantMsg('📸 Flyer received! Analyzing the image and extracting event details — this usually takes a few seconds…'));

      try {
        const ctx = buildCtx();
        const result = await mockAIAdapter.extractEventDetails(dataUri, '', ctx);
        setExtractedDetails(result);
        setStage('reviewing_extraction');

        push(
          assistantMsg(
            `✅ Done! I extracted **${Object.keys(result).filter((k) => result[k as keyof typeof result] && k !== 'confidence' && k !== 'uncertainFields').length} fields** from your flyer with **${Math.round(result.confidence * 100)}% confidence**.\n\nReview the details below — click any field to edit it — then hit **Create Event** when you're ready.`,
            { extraction: result },
          ),
        );
      } catch {
        push(assistantMsg('❌ Sorry, I had trouble reading that flyer. Please try uploading a clearer image, or type the event details manually.'));
        setStage('idle');
      } finally {
        setIsTyping(false);
      }
    };
    reader.readAsDataURL(file);
  }, [push, buildCtx]);

  /* Handle text send */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    push(userMsg(text));
    setIsTyping(true);

    try {
      const ctx = buildCtx();
      const { reply, updatedDetails } = await mockAIAdapter.continueEventConversation(text, ctx);
      if (updatedDetails && extractedDetails) {
        setExtractedDetails((prev) => prev ? { ...prev, ...updatedDetails } : prev);
      }
      push(assistantMsg(reply));
    } catch {
      push(assistantMsg('Sorry, something went wrong. Please try again.'));
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, push, buildCtx, extractedDetails]);

  /* Handle inline field edit */
  const handleFieldEdit = useCallback((field: keyof ExtractedEventDetails, value: string) => {
    setExtractedDetails((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
    // Update last extraction card
    setMessages((prev) =>
      prev.map((m) =>
        m.extraction ? { ...m, extraction: { ...m.extraction, [field]: value } } : m,
      ),
    );
  }, []);

  /* Handle confirm / create event */
  const handleConfirm = useCallback(() => {
    setStage('done');
    push(
      assistantMsg(
        '🎉 Your event has been prepared! In a live workspace this would create the event in your ARAM BTS database.\n\n**(This is a mock — no database record was created.)** When the real AI provider is integrated, this button will trigger the full event creation workflow.\n\nWant to start another event or refine this one?',
      ),
    );
    setExtractedDetails(null);
    setFlyerPreview(null);
    setFlyerDataUri(null);
  }, [push]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-[#F7F5FF]">
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main area */}
        <main className="flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Page Header */}
          <header className="bg-white border-b border-[#E6E2F0] px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4 shrink-0">
            <button
              type="button"
              className="md:hidden p-2 text-[#77738A] hover:text-[#17152B]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] flex items-center justify-center shadow-sm shrink-0">
                <span className="material-symbols-outlined text-white text-[20px]">smart_toy</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-[16px] font-bold text-[#17152B] font-space leading-tight">
                  AI Event Agent
                </h1>
                <p className="text-[12px] text-[#77738A]">
                  Create events from flyers or conversation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#10B981] bg-[#ECFDF5] border border-[#6EE7B7]/30 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Mock Mode
              </span>
              <Link
                href="/app/events/new"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#77738A] hover:text-[#17152B] border border-[#E6E2F0] rounded-lg px-3 py-1.5 hover:bg-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Classic Builder
              </Link>
            </div>
          </header>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
            {/* Flyer preview strip */}
            {flyerPreview && (
              <div className="flex items-center gap-3 bg-white border border-[#E6E2F0] rounded-xl p-3 shadow-xs max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flyerPreview}
                  alt="Uploaded event flyer"
                  className="w-12 h-12 rounded-lg object-cover border border-[#E6E2F0]"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-semibold text-[#17152B] truncate">Event Flyer</span>
                  <span className="text-[11px] text-[#77738A]">
                    {stage === 'extracting' ? 'Extracting…' : 'Analyzed ✓'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setFlyerPreview(null); setFlyerDataUri(null); }}
                  className="ml-auto text-[#77738A] hover:text-[#ba1a1a] p-1"
                  aria-label="Remove flyer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onEdit={handleFieldEdit}
                onConfirm={handleConfirm}
              />
            ))}

            {isTyping && <TypingIndicator />}

            {/* Dropzone */}
            {showDropzone && (
              <div className="max-w-lg">
                <FlyerDropzone onFile={handleFlyerFile} />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div className="bg-white border-t border-[#E6E2F0] px-4 sm:px-6 lg:px-8 py-4 shrink-0">
            <div className="flex items-end gap-3 bg-[#F7F5FF] border border-[#E6E2F0] rounded-2xl px-4 py-2.5 focus-within:border-[#7C5CFC]/50 focus-within:ring-1 focus-within:ring-[#7C5CFC]/20 transition-all">
              {/* Attach button */}
              <button
                type="button"
                id="agent-attach-flyer"
                onClick={() => setShowDropzone((v) => !v)}
                title="Upload event flyer"
                className={`p-1.5 rounded-lg transition-colors shrink-0 mb-0.5 ${
                  showDropzone
                    ? 'bg-[#7C5CFC]/10 text-[#7C5CFC]'
                    : 'text-[#77738A] hover:text-[#7C5CFC] hover:bg-[#7C5CFC]/5'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                id="agent-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to create an event, or describe it…"
                rows={1}
                className="flex-1 bg-transparent resize-none text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none leading-relaxed py-1 max-h-32 overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
                disabled={isTyping}
                aria-label="Chat input"
              />

              {/* Send */}
              <button
                type="button"
                id="agent-send-message"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#6366F1] text-white flex items-center justify-center shrink-0 hover:shadow-md hover:scale-105 transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>

            <p className="text-[11px] text-[#77738A] mt-2 text-center">
              AI Event Agent is in <strong>mock mode</strong> — no real AI calls or database writes.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
