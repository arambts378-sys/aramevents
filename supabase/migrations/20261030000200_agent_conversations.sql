-- ==============================================================================
-- AI Event Agent: saved conversation history
-- ==============================================================================
-- One row per chat, like the history list in ChatGPT or Claude. Each user only
-- ever sees their own chats (RLS on user_id = auth.uid()). Messages are stored
-- as JSON; flyer images are NOT stored here (they can be several MB) - only the
-- file name, plus the flyer's transcribed text so follow-up turns stay grounded.
-- Idempotent.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id     UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  title            TEXT NOT NULL DEFAULT 'New chat' CHECK (char_length(title) <= 120),
  messages         JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(messages) = 'array'),
  draft            JSONB,
  flyer_text       TEXT CHECK (flyer_text IS NULL OR char_length(flyer_text) <= 20000),
  created_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Keeps a runaway client from storing huge rows (images are stripped before saving).
  CONSTRAINT agent_conversations_size CHECK (pg_column_size(messages) <= 1048576)
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_updated
  ON public.agent_conversations (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_agent_conversations_updated_at ON public.agent_conversations;
CREATE TRIGGER trg_agent_conversations_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own agent chats" ON public.agent_conversations;
CREATE POLICY "Users read their own agent chats"
  ON public.agent_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create their own agent chats" ON public.agent_conversations;
CREATE POLICY "Users create their own agent chats"
  ON public.agent_conversations FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(workspace_id))
  );

DROP POLICY IF EXISTS "Users update their own agent chats" ON public.agent_conversations;
CREATE POLICY "Users update their own agent chats"
  ON public.agent_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(workspace_id))
  );

DROP POLICY IF EXISTS "Users delete their own agent chats" ON public.agent_conversations;
CREATE POLICY "Users delete their own agent chats"
  ON public.agent_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.agent_conversations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_conversations TO authenticated;
