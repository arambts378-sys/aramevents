import { createClient } from '@/lib/supabase/client';
import type { ExtractedEventDetails } from '@/lib/ai/types';
import type { ConversationSummary, StoredMessage } from '@/lib/ai/conversationHistory';

/** Saved AI Event Agent chats. RLS limits every query to the signed-in user's own rows. */
export type ConversationRecord = ConversationSummary & {
  messages: StoredMessage[];
  draft: ExtractedEventDetails | null;
  flyer_text: string | null;
};

type SavePayload = {
  title: string;
  messages: StoredMessage[];
  draft: ExtractedEventDetails | null;
  flyer_text: string | null;
  workspace_id?: string | null;
  created_event_id?: string | null;
};

/** True when the table is missing (the migration has not run yet), so the page can hide history quietly. */
export const isHistoryUnavailable = (err: unknown) => {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === '42P01' || e?.code === 'PGRST205' || /agent_conversations/.test(e?.message || '');
};

export const agentConversationsService = {
  async list(limit = 100): Promise<ConversationSummary[]> {
    const { data, error } = await createClient()
      .from('agent_conversations')
      .select('id, title, updated_at, created_event_id')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ConversationSummary[];
  },

  async get(id: string): Promise<ConversationRecord | null> {
    const { data, error } = await createClient()
      .from('agent_conversations')
      .select('id, title, updated_at, created_event_id, messages, draft, flyer_text')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as ConversationRecord | null;
  },

  async create(payload: SavePayload): Promise<ConversationSummary> {
    const { data, error } = await createClient()
      .from('agent_conversations')
      .insert(payload)
      .select('id, title, updated_at, created_event_id')
      .single();
    if (error) throw error;
    return data as ConversationSummary;
  },

  async update(id: string, payload: Partial<SavePayload>): Promise<ConversationSummary> {
    const { data, error } = await createClient()
      .from('agent_conversations')
      .update(payload)
      .eq('id', id)
      .select('id, title, updated_at, created_event_id')
      .single();
    if (error) throw error;
    return data as ConversationSummary;
  },

  async remove(id: string): Promise<void> {
    const { error } = await createClient().from('agent_conversations').delete().eq('id', id);
    if (error) throw error;
  },
};
