'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PetLauncher } from './assist/PetLauncher';
import { ExitSurveyCard } from './assist/ExitSurveyCard';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const NAME = 'Aram Assist';
const SUGGESTIONS = [
  { icon: 'event', label: 'Create an event', prompt: 'How do I create an event?' },
  { icon: 'sell', label: 'Compare plans', prompt: 'Which plan fits 500 guests?' },
  { icon: 'qr_code_scanner', label: 'QR check-in', prompt: 'How does QR check-in work?' },
  { icon: 'travel_explore', label: 'Find an event', prompt: 'Find an event to attend' },
];

// Session keys: the conversation survives page changes, and the welcome plays once per visit.
const CHAT_KEY = 'aram-assist-chat';
const GREETED_KEY = 'aram-assist-greeted';
const TIPS_KEY = 'aram-assist-tips';
const EXIT_KEY = 'aram-assist-exit-asked';
const WELCOME_DELAY = 1400;
const WELCOME_FOR = 8000;
const TIP_FOR = 7000;
const PET_FOR = 2200;
/** A section must stay in view this long before the robot mentions it */
const TIP_DWELL_MS = 1600;
/** At least this long between two tips */
const TIP_GAP_MS = 25_000;
/** No exit survey in the first seconds of a visit */
const EXIT_ARM_MS = 5000;
const TUCK_MS = 380;

type Popup =
  | { kind: 'welcome' }
  | { kind: 'tip'; id: string; text: string; action: string; prompt: string }
  | { kind: 'pet'; line: string }
  | { kind: 'exit' };
/** A popup only replaces one of lower or equal rank */
const POPUP_RANK: Record<Popup['kind'], number> = { pet: 0, tip: 1, welcome: 2, exit: 3 };

/** Tips for sections marked with data-assist-tip, keyed by that attribute's value */
const SECTION_TIPS: Record<string, { text: string; action: string; prompt: string }> = {
  journey: { text: 'Curious how one guest list connects everything? 🧩', action: 'Show me how', prompt: 'What can Aram do for my event?' },
  steps: { text: 'Want me to walk you through setting up your first event? ✨', action: 'Yes, guide me', prompt: 'How do I create an event?' },
  'event-day': { text: 'Wondering how QR check-in works at the door? 📱', action: 'Explain check-in', prompt: 'How does QR check-in work?' },
  reports: { text: 'Need your attendee list in Excel after the event? 📊', action: 'How do I export?', prompt: 'How do I download the attendee list?' },
  'get-started': { text: 'Ready to start? It’s free for up to 100 attendees! 🎉', action: 'What do I get free?', prompt: 'What is included in the free plan?' },
  pricing: { text: 'Not sure which plan fits? Tell me your guest count! 🤔', action: 'Help me choose', prompt: 'Which plan fits 500 guests?' },
  'live-events': { text: 'Looking for an event to join? I can help you find one! 🎟️', action: 'How do I register?', prompt: 'How do I register for an event?' },
};

const PET_LINES = ['Hehe, that tickles! 💜', 'Aww, thank you! 🥰', 'More pats please! ✨', 'You’re my favourite! 💫'];

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

/** The robot's head, for the launcher and message avatars. */
function Head({ size }: { size: number }) {
  return <Image src="/aram-assist-head.webp" alt="" width={size} height={size} className="select-none" draggable={false} />;
}

/** The whole robot, for the welcome and the empty chat. */
function Robot({ size, className = '' }: { size: number; className?: string }) {
  return (
    <Image
      src="/aram-assist-robot.webp"
      alt=""
      width={size}
      height={size}
      priority={false}
      draggable={false}
      className={`select-none drop-shadow-[0_18px_24px_rgba(27,16,53,0.28)] ${className}`}
    />
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label={`${NAME} is typing`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="assist-dot h-1.5 w-1.5 rounded-full bg-[#38C7D6]" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

export function SiteChatbot() {
  const [open, setOpen] = useState(false);
  // Restore this visit's conversation. Safe on the client's first render: messages only render inside the panel, which starts closed.
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const parsed = JSON.parse(read(CHAT_KEY) || '[]');
      return Array.isArray(parsed) ? (parsed as ChatMessage[]).filter((m) => m && typeof m.content === 'string') : [];
    } catch {
      return [];
    }
  });
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  /**
   * The robot outside the chat panel: the once-per-visit welcome, a tip about the section in view,
   * a happy reaction to petting, or the exit survey. Only one shows at a time.
   */
  const [popup, setPopup] = useState<Popup | null>(null);
  const [tucking, setTucking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const holdPopup = useRef(false); // hovering or focusing the popup keeps it up
  const popupRef = useRef<Popup | null>(null);
  const openRef = useRef(false);
  const hideTimer = useRef<number | null>(null);
  const lastTipAt = useRef(0);
  useEffect(() => {
    popupRef.current = popup;
    openRef.current = open;
  });

  const dismissPopup = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setTucking(true);
    window.setTimeout(() => {
      setPopup(null);
      setTucking(false);
    }, TUCK_MS);
  }, []);

  /** Shows a popup unless something more important is already up. Auto-hides after `forMs` (not the survey). */
  const showPopup = useCallback(
    (next: Popup, forMs?: number) => {
      const current = popupRef.current;
      if (openRef.current) return false;
      if (current && POPUP_RANK[current.kind] > POPUP_RANK[next.kind]) return false;
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setTucking(false);
      setPopup(next);
      if (forMs) {
        const autoHide = () => {
          if (holdPopup.current) {
            hideTimer.current = window.setTimeout(autoHide, 1500);
            return;
          }
          dismissPopup();
        };
        hideTimer.current = window.setTimeout(autoHide, forMs);
      }
      return true;
    },
    [dismissPopup]
  );

  // New visit: the robot rises, waves and says hi, then tucks back into the launcher.
  useEffect(() => {
    if (read(GREETED_KEY)) return;
    const t = window.setTimeout(() => {
      // Marked here, not before the timer, so an effect re-run (React dev mode) cannot skip the welcome.
      write(GREETED_KEY, '1');
      showPopup({ kind: 'welcome' }, WELCOME_FOR);
    }, WELCOME_DELAY);
    return () => window.clearTimeout(t);
  }, [showPopup]);

  // Section tips: when a marked section stays in view, the robot peeks out with a hint about it (once per section per visit).
  const pathname = usePathname();
  useEffect(() => {
    const seen = new Set<string>(JSON.parse(read(TIPS_KEY) || '[]') as string[]);
    const timers = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.dataset.assistTip;
          if (!id || seen.has(id)) continue;
          if (entry.isIntersecting) {
            if (timers.has(el)) continue;
            timers.set(
              el,
              window.setTimeout(() => {
                timers.delete(el);
                if (Date.now() - lastTipAt.current < TIP_GAP_MS) return;
                const tip = SECTION_TIPS[id];
                if (!tip) return;
                if (showPopup({ kind: 'tip', id, ...tip }, TIP_FOR)) {
                  seen.add(id);
                  lastTipAt.current = Date.now();
                  write(TIPS_KEY, JSON.stringify([...seen]));
                }
              }, TIP_DWELL_MS)
            );
          } else if (timers.has(el)) {
            window.clearTimeout(timers.get(el));
            timers.delete(el);
          }
        }
      },
      { threshold: 0.35 }
    );
    // Let the page render its sections before looking for them.
    const start = window.setTimeout(() => document.querySelectorAll('[data-assist-tip]').forEach((el) => io.observe(el)), 600);
    return () => {
      window.clearTimeout(start);
      timers.forEach((t) => window.clearTimeout(t));
      io.disconnect();
    };
  }, [pathname, showPopup]);

  // Exit intent, once per visit: the cursor heads for the tab bar, or the visitor switches tabs and comes back.
  useEffect(() => {
    if (read(EXIT_KEY)) return;
    const armedAt = Date.now() + EXIT_ARM_MS;
    let leftTab = false;
    const ask = () => {
      if (read(EXIT_KEY) || Date.now() < armedAt) return;
      if (showPopup({ kind: 'exit' })) write(EXIT_KEY, '1');
    };
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) ask();
    };
    const onVisibility = () => {
      if (document.hidden) leftTab = Date.now() >= armedAt;
      else if (leftTab) ask();
    };
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [showPopup]);

  const onPet = () => {
    if (!popupRef.current) showPopup({ kind: 'pet', line: PET_LINES[Math.floor(Math.random() * PET_LINES.length)] }, PET_FOR);
  };

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

  const openChat = (ask?: string) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setPopup(null);
    setOpen(true);
    if (ask) window.setTimeout(() => sendRef.current(ask), 120);
    else window.setTimeout(() => inputRef.current?.focus(), 60);
  };
  const sendRef = useRef<(text: string) => void>(() => {});

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || typing) return;
      const history = [...messages, { role: 'user' as const, content: question }];
      setMessages(history);
      setInput('');
      setError(null);
      setTyping(true);
      const started = Date.now();
      try {
        const res = await fetch('/api/site-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.reply !== 'string') throw new Error(data.error || `${NAME} is unavailable right now. Please try again shortly.`);
        // A short beat of "typing" reads more naturally than an instant wall of text.
        await new Promise((r) => setTimeout(r, Math.max(0, MIN_TYPING_MS - (Date.now() - started))));
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setTyping(false);
      }
    },
    [messages, typing]
  );
  useEffect(() => {
    sendRef.current = send;
  });

  const restart = () => {
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(CHAT_KEY);
    } catch {
      /* nothing saved */
    }
    inputRef.current?.focus();
  };

  const empty = messages.length === 0 && !typing;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 font-jakarta sm:bottom-6 sm:right-6">
      {/* ── The robot outside the panel: welcome, section tip, pet reaction or exit survey ── */}
      {popup && !open && (
        <div
          className={`flex items-end gap-2 ${tucking ? 'assist-tuck' : ''}`}
          onMouseEnter={() => (holdPopup.current = true)}
          onMouseLeave={() => (holdPopup.current = false)}
          onFocusCapture={() => (holdPopup.current = true)}
          role={popup.kind === 'exit' ? 'dialog' : 'status'}
          aria-label={popup.kind === 'exit' ? 'Leaving so soon?' : undefined}
          aria-live={popup.kind === 'exit' ? undefined : 'polite'}
        >
          <div
            key={popup.kind === 'tip' ? popup.id : popup.kind}
            className={`assist-bubble relative rounded-2xl rounded-br-md bg-white p-4 shadow-[0_24px_60px_-20px_rgba(23,20,42,0.45)] ring-1 ring-stage-ink/[0.06] ${
              popup.kind === 'pet' ? 'mb-16 w-auto py-2.5' : popup.kind === 'exit' ? 'mb-12 w-[min(320px,calc(100vw-8.5rem))]' : 'mb-14 w-[min(272px,calc(100vw-9rem))]'
            }`}
          >
            {popup.kind !== 'pet' && (
              <button
                type="button"
                onClick={dismissPopup}
                aria-label="Dismiss"
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-stage-ink/40 hover:bg-stage-paper hover:text-stage-ink"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}

            {popup.kind === 'welcome' && (
              <>
                <p className="font-display text-[17px] font-bold tracking-[0.01em] text-stage-ink">
                  Hi there! <span className="assist-hand" aria-hidden="true">👋</span>
                </p>
                <p className="mt-1 pr-3 text-[13.5px] leading-snug text-stage-ink/70">
                  Welcome to Aram Events. I&apos;m {NAME}, here to help you plan, sell and run your event.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openChat()}
                    className="rounded-full bg-stage-violet px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#5A3DE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet focus-visible:ring-offset-2"
                  >
                    Start chatting
                  </button>
                  <button type="button" onClick={dismissPopup} className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-stage-ink/55 hover:bg-stage-paper hover:text-stage-ink">
                    Maybe later
                  </button>
                </div>
              </>
            )}

            {popup.kind === 'tip' && (
              <>
                <p className="pr-5 text-[14px] font-semibold leading-snug text-stage-ink">{popup.text}</p>
                <button
                  type="button"
                  onClick={() => openChat(popup.prompt)}
                  className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-stage-paper px-3 py-1.5 text-[12.5px] font-semibold text-stage-violet transition-colors hover:bg-stage-violet hover:text-white"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">chat_bubble</span>
                  {popup.action}
                </button>
              </>
            )}

            {popup.kind === 'pet' && <p className="whitespace-nowrap text-[13.5px] font-semibold text-stage-ink">{popup.line}</p>}

            {popup.kind === 'exit' && <ExitSurveyCard onClose={dismissPopup} onChat={() => openChat()} />}
          </div>

          {/* The full robot, posed for the moment. The pet reaction stays on the launcher's head. */}
          {popup.kind !== 'pet' && (
            <div className={popup.kind === 'tip' ? 'assist-peek' : 'assist-rise'}>
              <div className={popup.kind === 'welcome' ? 'assist-wave' : popup.kind === 'exit' ? 'assist-worried' : 'assist-nod'}>
                <Robot size={popup.kind === 'tip' ? 96 : 112} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          role="dialog"
          aria-label={NAME}
          className="assist-panel flex h-[min(620px,calc(100dvh-6.5rem))] w-[calc(100vw-2rem)] max-w-[400px] origin-bottom-right flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_40px_90px_-24px_rgba(23,20,42,0.5)] ring-1 ring-stage-ink/[0.08]"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-stage-night via-[#2A1A5E] to-[#3B2390] px-4 py-3.5 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(94,231,240,0.25),transparent_70%)]" />
            <div className="relative flex items-center gap-3">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]">
                <Head size={34} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#2A1A5E] bg-[#5EE7F0]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[16px] font-bold leading-tight tracking-[0.01em]">{NAME}</p>
                <p className="mt-0.5 truncate text-[12px] text-white/65">Online now</p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={restart}
                  aria-label="Start a new conversation"
                  title="New conversation"
                  className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <span className="material-symbols-outlined text-[19px]">edit_square</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div ref={listRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-[#F7F5FF] to-white px-4 py-5" aria-live="polite">
            {empty ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="assist-float">
                  <Robot size={104} />
                </div>
                <p className="font-display mt-3 text-[19px] font-bold tracking-[0.01em] text-stage-ink">Hi, I&apos;m {NAME}</p>
                <p className="mt-1 max-w-[260px] text-[13.5px] leading-snug text-stage-ink/60">
                  Ask me about planning an event, plans and pricing, or finding one to attend.
                </p>
                <div className="mt-5 grid w-full grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => send(s.prompt)}
                      className="group flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-[13px] font-medium text-stage-ink shadow-[0_1px_2px_rgba(23,20,42,0.06)] ring-1 ring-stage-ink/[0.08] transition hover:-translate-y-0.5 hover:ring-stage-violet/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stage-paper text-stage-violet transition-colors group-hover:bg-stage-violet group-hover:text-white">
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{s.icon}</span>
                      </span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {messages.map((m, i) => {
                  const lastOfGroup = messages[i + 1]?.role !== m.role;
                  return m.role === 'assistant' ? (
                    <div key={i} className={`assist-msg flex items-end gap-2 ${lastOfGroup ? 'pb-1.5' : ''}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${lastOfGroup ? '' : 'invisible'}`}>
                        <Head size={28} />
                      </span>
                      <p className="max-w-[82%] whitespace-pre-line rounded-[18px] rounded-bl-md bg-white px-3.5 py-2.5 text-[14px] leading-6 text-stage-ink shadow-[0_1px_2px_rgba(23,20,42,0.06)] ring-1 ring-stage-ink/[0.06]">
                        {renderWithLinks(m.content)}
                      </p>
                    </div>
                  ) : (
                    <div key={i} className={`assist-msg flex justify-end ${lastOfGroup ? 'pb-1.5' : ''}`}>
                      <p className="max-w-[82%] whitespace-pre-line rounded-[18px] rounded-br-md bg-gradient-to-br from-[#7C5CFC] to-stage-violet px-3.5 py-2.5 text-[14px] leading-6 text-white shadow-[0_6px_16px_-8px_rgba(109,80,245,0.7)]">
                        {m.content}
                      </p>
                    </div>
                  );
                })}

                {typing && (
                  <div className="flex items-end gap-2">
                    <Head size={28} />
                    <div className="rounded-[18px] rounded-bl-md bg-white px-4 py-2.5 ring-1 ring-stage-ink/[0.06]">
                      <TypingDots />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-3 text-center text-[12.5px] text-red-600">{error}</p>}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="bg-white px-3 pb-2.5 pt-2.5"
          >
            <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 ring-1 ring-stage-ink/[0.12] transition focus-within:ring-2 focus-within:ring-stage-violet/50">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                placeholder="Message Aram Assist"
                aria-label="Your message"
                className="min-w-0 flex-1 bg-transparent py-1 text-[14px] text-stage-ink placeholder:text-stage-ink/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={typing || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C5CFC] to-stage-violet text-white shadow-[0_6px_14px_-6px_rgba(109,80,245,0.8)] transition hover:brightness-110 disabled:bg-none disabled:bg-stage-ink/10 disabled:text-stage-ink/30 disabled:shadow-none"
              >
                <span className="material-symbols-outlined text-[19px]">arrow_upward</span>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10.5px] text-stage-ink/40">
              {NAME} can make mistakes. For account help, <Link href="/contact" className="underline underline-offset-2">contact us</Link>.
            </p>
          </form>
        </div>
      )}

      {/* ── Launcher: the robot's head, which watches the cursor and loves being petted ── */}
      <PetLauncher
        open={open}
        hidden={!!popup && popup.kind !== 'pet' && !open}
        label={NAME}
        onToggle={() => (open ? setOpen(false) : openChat())}
        onPet={onPet}
      />
    </div>
  );
}
