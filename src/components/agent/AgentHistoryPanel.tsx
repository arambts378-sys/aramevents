'use client';

import React, { useMemo, useState } from 'react';
import { groupConversations, type ConversationSummary } from '@/lib/ai/conversationHistory';

/** "now", "5m", "3h", "Yesterday", "Mon", "12 Oct" */
function shortTime(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.round((now - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (t >= startOfToday) return `${Math.round(mins / 60)}h`;
  if (t >= startOfToday - 86_400_000) return 'Yesterday';
  const d = new Date(t);
  if (t >= startOfToday - 6 * 86_400_000) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface Props {
  items: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  /** The history table is missing or unreachable; chats still work, they just are not saved. */
  unavailable: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  /** Drawer on small screens */
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Collapsed column on large screens */
  collapsed: boolean;
}

function HistoryList({ items, activeId, loading, unavailable, onSelect, onNew, onDelete }: Omit<Props, 'mobileOpen' | 'onMobileClose' | 'collapsed'>) {
  const [query, setQuery] = useState('');
  /** The chat whose delete is waiting for a second click */
  const [confirming, setConfirming] = useState<string | null>(null);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupConversations(q ? items.filter((c) => c.title.toLowerCase().includes(q)) : items);
  }, [items, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2.5 rounded-xl border border-ds-line bg-white px-3 py-2.5 text-[13.5px] font-medium text-ds-ink shadow-[0_1px_2px_rgba(17,17,19,0.04)] transition-all hover:border-ds-accent/40 hover:shadow-[0_2px_8px_rgba(17,17,19,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ds-accent-soft text-ds-accent" aria-hidden="true">
            <span className="material-symbols-outlined text-[16px]">add</span>
          </span>
          New chat
        </button>
        {items.length > 0 && (
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-ds-muted" aria-hidden="true">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="w-full rounded-lg border border-transparent bg-ds-ink/[0.04] py-1.5 pl-8 pr-7 text-[13px] text-ds-ink placeholder:text-ds-muted transition-colors focus:border-ds-accent focus:bg-white focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-ds-muted hover:text-ds-ink"
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
              </button>
            )}
          </div>
        )}
      </div>

      <nav aria-label="Chat history" className="flex-1 overflow-y-auto px-2 pb-4" style={{ scrollbarWidth: 'thin' }}>
        {unavailable ? (
          <p className="px-2 py-3 text-[12.5px] leading-relaxed text-ds-muted">
            Chat history is not set up yet, so this conversation will not be saved.
          </p>
        ) : loading ? (
          <div className="space-y-2 px-2 py-2" aria-hidden="true">
            {[70, 55, 80, 60].map((w, i) => (
              <div key={i} className="h-3.5 animate-pulse rounded bg-ds-line" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-2 py-3 text-[12.5px] leading-relaxed text-ds-muted">
            Your chats will appear here, so you can come back to a draft any time.
          </p>
        ) : groups.length === 0 ? (
          <p className="px-2 py-3 text-[12.5px] text-ds-muted">No chats match &ldquo;{query}&rdquo;.</p>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mt-3 first:mt-1">
              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ds-muted">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((c) => {
                  const active = c.id === activeId;
                  if (confirming === c.id) {
                    return (
                      <li key={c.id} className="flex items-center gap-1 rounded-lg bg-ds-danger-soft py-1 pl-2.5 pr-1" role="group" aria-label={`Delete ${c.title}?`}>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ds-danger">Delete this chat?</span>
                        <button
                          type="button"
                          autoFocus
                          onClick={() => {
                            setConfirming(null);
                            onDelete(c.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setConfirming(null);
                          }}
                          className="rounded-md bg-ds-danger px-2 py-1 text-[12px] font-medium text-white hover:opacity-90"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="rounded-md px-2 py-1 text-[12px] text-ds-body hover:bg-white/60"
                        >
                          Cancel
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={c.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-2.5 pr-10 text-left text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${
                          active
                            ? 'bg-white font-medium text-ds-ink shadow-[0_1px_3px_rgba(17,17,19,0.08)]'
                            : 'text-ds-body hover:bg-ds-ink/[0.045] hover:text-ds-ink'
                        }`}
                      >
                        {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-ds-accent" aria-hidden="true" />}
                        {c.created_event_id ? (
                          <span className="material-symbols-outlined shrink-0 text-[16px] text-ds-success" title="Event created" aria-label="Event created">
                            check_circle
                          </span>
                        ) : (
                          <span className={`material-symbols-outlined shrink-0 text-[16px] ${active ? 'text-ds-accent' : 'text-ds-muted'}`} aria-hidden="true">
                            chat_bubble
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>
                        <span className="absolute right-2.5 text-[11px] font-normal tabular-nums text-ds-muted transition-opacity group-hover:opacity-0 group-focus-within:opacity-0">
                          {shortTime(c.updated_at)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(c.id)}
                        aria-label={`Delete chat ${c.title}`}
                        title="Delete chat"
                        className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ds-muted opacity-0 transition-opacity hover:bg-ds-ink/[0.06] hover:text-ds-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">delete</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </div>
  );
}

/** ChatGPT-style chat history: a column on large screens, a drawer on small ones. */
export function AgentHistoryPanel({ mobileOpen, onMobileClose, collapsed, ...list }: Props) {
  return (
    <>
      {!collapsed && (
        <aside className="hidden w-[260px] shrink-0 border-r border-ds-line bg-ds-subtle lg:block" aria-label="Chat history">
          <div className="h-dvh">
            <HistoryList {...list} />
          </div>
        </aside>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button type="button" aria-label="Close chat history" className="absolute inset-0 bg-ds-ink/30" onClick={onMobileClose} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-[300px] flex-col bg-ds-subtle shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-ds-line px-3">
              <p className="text-[14px] font-medium text-ds-ink">Chats</p>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close chat history"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ds-muted hover:bg-ds-ink/[0.05] hover:text-ds-ink"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <HistoryList
                {...list}
                onSelect={(id) => {
                  list.onSelect(id);
                  onMobileClose();
                }}
                onNew={() => {
                  list.onNew();
                  onMobileClose();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
