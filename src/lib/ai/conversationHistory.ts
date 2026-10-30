import type { ChatMessage, ExtractedEventDetails } from './types';

/** A message as the agent page holds it: may carry a flyer attachment (a data URI). */
export type HistoryMessage = ChatMessage & { attachment?: { name: string; url: string } };

/** What is stored per message: no images, plain ISO timestamps. */
export type StoredMessage = {
  id: string;
  role: ChatMessage['role'];
  content: string;
  timestamp: string;
  extraction?: ExtractedEventDetails;
  attachment?: { name: string };
};

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
  created_event_id: string | null;
};

const MAX_STORED_MESSAGES = 200;
const MAX_TITLE = 80;

/** Strips flyer images (data URIs, often megabytes) and keeps the file name so the chat still reads right. */
export function toStored(messages: HistoryMessage[]): StoredMessage[] {
  return messages.slice(-MAX_STORED_MESSAGES).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: (m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)).toISOString(),
    ...(m.extraction ? { extraction: m.extraction } : {}),
    ...(m.attachment ? { attachment: { name: m.attachment.name } } : {}),
  }));
}

/** Restores stored messages; an attachment comes back without its image. */
export function fromStored(stored: unknown): HistoryMessage[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((m): m is StoredMessage => !!m && typeof m === 'object' && typeof (m as StoredMessage).content === 'string')
    .map((m) => ({
      id: m.id || Math.random().toString(36).slice(2, 10),
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
      timestamp: new Date(m.timestamp || Date.now()),
      ...(m.extraction ? { extraction: m.extraction } : {}),
      ...(m.attachment?.name ? { attachment: { name: m.attachment.name, url: '' } } : {}),
    }));
}

const clip = (s: string) => {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > MAX_TITLE ? `${one.slice(0, MAX_TITLE - 1).trimEnd()}…` : one;
};

/** The event's name once the draft has one, else the flyer's name, else the first thing the user said. */
export function conversationTitle(messages: HistoryMessage[], draft: ExtractedEventDetails | null): string {
  if (draft?.name?.trim()) return clip(draft.name);
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New chat';
  if (first.attachment?.name) return clip(`Flyer: ${first.attachment.name.replace(/\.[a-z0-9]+$/i, '')}`);
  return clip(first.content) || 'New chat';
}

export type HistoryGroup = { label: string; items: ConversationSummary[] };

/** Buckets chats the way ChatGPT and Claude do: Today, Yesterday, Previous 7 days, Previous 30 days, Older. */
export function groupConversations(items: ConversationSummary[], now = new Date()): HistoryGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const buckets: HistoryGroup[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Previous 30 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const c of [...items].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    const t = new Date(c.updated_at).getTime();
    const i = t >= startOfToday ? 0 : t >= startOfToday - day ? 1 : t >= startOfToday - 7 * day ? 2 : t >= startOfToday - 30 * day ? 3 : 4;
    buckets[i].items.push(c);
  }
  return buckets.filter((b) => b.items.length);
}
