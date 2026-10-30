'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const NAME = 'Aram Assist';
const GREETING: ChatMessage = {
  role: 'assistant',
  content: `Hi there! I'm ${NAME}. Ask me anything about running an event on Aram, or finding one to attend.`,
};
const SUGGESTIONS = ['How do I create an event?', 'Which plan fits 500 guests?', 'How does QR check-in work?', 'Find an event to attend'];

// Session keys: the conversation survives page changes, and the welcome plays once per visit.
const CHAT_KEY = 'aram-assist-chat';
const GREETED_KEY = 'aram-assist-greeted';
const AUTO_OPEN_DELAY = 1500;
const AUTO_CLOSE_AFTER = 6500;
const MIN_TYPING_MS = 550;

const read = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode: nothing to keep */
  }
};

const LINKS: Record<string, string> = {
  '/pricing': 'pricing',
  '/contact': 'contact us',
  '/live-events': 'live events',
  '/login': 'log in',
  '/organizer/register': 'create an account',
  '/privacy': 'privacy policy',
  '/about': 'about Aram',
  '/terms': 'terms',
};
const LINK_PATTERN = new RegExp(`(${Object.keys(LINKS).map((p) => p.replace('/', '\\/')).join('|')})\\b`, 'g');

function renderWithLinks(text: string) {
  return text.split(LINK_PATTERN).map((part, i) =>
    LINKS[part] ? (
      <Link key={i} href={part} className="font-semibold text-stage-violet underline decoration-stage-violet/30 underline-offset-2 hover:decoration-stage-violet">
        {LINKS[part]}
      </Link>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function Mark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-stage-ink/10"
      style={{ width: size, height: size }}
    >
      <Image src="/aram-mark.png" alt="" width={337} height={418} className="h-auto" style={{ width: size * 0.42 }} />
    </span>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label={`${NAME} is typing`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="assist-dot h-1.5 w-1.5 rounded-full bg-stage-ink/40" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

export function SiteChatbot() {
  const [open, setOpen] = useState(false);
  // Restore this visit's conversation. Safe to read on the client's first render:
  // messages only render inside the panel, which always starts closed.
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const parsed = JSON.parse(read(CHAT_KEY) || '[]');
      return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const engaged = useRef(false); // set once the visitor touches the panel; stops the auto-close
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // Play the welcome once per session: open, type "hi", then close unless the visitor engages.
  useEffect(() => {
    if (read(GREETED_KEY)) return;

    const pending = timers.current;
    pending.push(
      window.setTimeout(() => {
        // Marked here, not before the timer, so an effect re-run (React dev mode) can't skip the welcome.
        write(GREETED_KEY, '1');
        setOpen(true);
        setTyping(true);
        pending.push(
          window.setTimeout(() => {
            setTyping(false);
            setMessages((m) => (m.length ? m : [GREETING]));
            pending.push(
              window.setTimeout(() => {
                if (!engaged.current) setOpen(false);
              }, AUTO_CLOSE_AFTER)
            );
          }, 1100)
        );
      }, AUTO_OPEN_DELAY)
    );
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (messages.length) write(CHAT_KEY, JSON.stringify(messages.slice(-30)));
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const engage = () => {
    engaged.current = true;
  };

  const toggle = () => {
    engage();
    setOpen((o) => {
      const next = !o;
      if (next) {
        if (!messages.length) setMessages([GREETING]);
        later(() => inputRef.current?.focus(), 50);
      }
      return next;
    });
  };

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || typing) return;
      engage();
      const history = [...(messages.length ? messages : [GREETING]), { role: 'user' as const, content: question }];
      setMessages(history);
      setInput('');
      setError(null);
      setTyping(true);
      const started = Date.now();
      try {
        const res = await fetch('/api/site-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // The greeting is UI only; the server sees the conversation from the visitor's first message.
          body: JSON.stringify({ messages: history.filter((m) => m !== GREETING) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.reply !== 'string') throw new Error(data.error || `${NAME} is unavailable right now. Please try again shortly.`);
        // A short beat of "typing" reads more naturally than an instant wall of text.
        const wait = Math.max(0, MIN_TYPING_MS - (Date.now() - started));
        await new Promise((r) => setTimeout(r, wait));
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setTyping(false);
      }
    },
    [messages, typing]
  );

  const restart = () => {
    engage();
    setMessages([GREETING]);
    setError(null);
    inputRef.current?.focus();
  };

  const showSuggestions = !typing && messages.length <= 1;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 font-jakarta sm:bottom-6 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label={NAME}
          onPointerDown={engage}
          onFocusCapture={engage}
          className="assist-panel flex h-[min(600px,calc(100dvh-6.5rem))] w-[calc(100vw-2rem)] max-w-[392px] origin-bottom-right flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_30px_80px_-20px_rgba(23,20,42,0.45)] ring-1 ring-stage-ink/10"
        >
          {/* Header */}
          <div className="relative flex items-center gap-3 bg-stage-night px-5 py-4 text-white">
            <Mark size={40} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] font-bold leading-tight">{NAME}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/65">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Online now
              </p>
            </div>
            <button
              type="button"
              onClick={restart}
              aria-label="Start a new conversation"
              title="Start over"
              className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span className="material-symbols-outlined text-[19px]">refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Conversation */}
          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-[#FBFAFE] px-4 py-5" aria-live="polite">
            {messages.map((m, i) =>
              m.role === 'assistant' ? (
                <div key={i} className="assist-msg flex items-end gap-2.5">
                  <Mark size={28} />
                  <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-[14px] leading-6 text-stage-ink shadow-[0_1px_2px_rgba(23,20,42,0.06)] ring-1 ring-stage-ink/[0.06]">
                    {renderWithLinks(m.content)}
                  </p>
                </div>
              ) : (
                <div key={i} className="assist-msg flex justify-end">
                  <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-br-md bg-stage-violet px-4 py-2.5 text-[14px] leading-6 text-white">
                    {m.content}
                  </p>
                </div>
              )
            )}

            {typing && (
              <div className="flex items-end gap-2.5">
                <Mark size={28} />
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-2.5 ring-1 ring-stage-ink/[0.06]">
                  <TypingDots />
                </div>
              </div>
            )}

            {showSuggestions && messages.length > 0 && (
              <div className="flex flex-col items-start gap-2 pl-[38px]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-stage-violet/25 bg-white px-3.5 py-1.5 text-left text-[13px] font-medium text-stage-violet transition-colors hover:border-stage-violet hover:bg-stage-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-center text-[12.5px] text-red-600">{error}</p>}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-stage-ink/[0.07] bg-white px-4 pb-3 pt-3"
          >
            <div className="flex items-center gap-2 rounded-2xl bg-stage-paper/70 py-1.5 pl-4 pr-1.5 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-stage-violet/40">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                placeholder="Ask Aram Assist…"
                aria-label="Your message"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] text-stage-ink placeholder:text-stage-ink/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={typing || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stage-night text-white transition-colors hover:bg-stage-violet disabled:bg-stage-ink/15"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-stage-ink/40">
              {NAME} can make mistakes. For account help, <Link href="/contact" className="underline underline-offset-2">contact us</Link>.
            </p>
          </form>
        </div>
      )}

      {/* Launcher */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close Aram Assist' : 'Open Aram Assist'}
        aria-expanded={open}
        className="group flex h-14 items-center gap-2.5 rounded-full bg-stage-night pl-2 pr-5 text-white shadow-[0_14px_36px_-10px_rgba(23,20,42,0.6)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet focus-visible:ring-offset-2"
      >
        {open ? (
          <span className="flex h-10 w-10 items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">expand_more</span>
          </span>
        ) : (
          <Mark size={40} />
        )}
        <span className="text-[14px] font-semibold">{open ? 'Close' : NAME}</span>
      </button>
    </div>
  );
}
