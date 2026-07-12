-- ============================================================================
-- ARIA Agent — Phase 1 (the mind): persistent conversation threads, per-user
-- preferences, and the weekly self-improvement learning log.
--
-- ADDITIVE ONLY. Every statement is idempotent (IF NOT EXISTS / DROP POLICY IF
-- EXISTS) so re-running is safe. No existing table is altered or dropped, so
-- there is no data-loss risk. Rollback: DROP the three tables below (documented
-- in docs/ROLLBACK.md). RLS is self-scoped exactly like aria_memory.
-- ============================================================================

-- ============ aria_conversations ============================================
-- One row per conversation thread, so ARIA remembers threads across sessions.
CREATE TABLE IF NOT EXISTS public.aria_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, thread_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_conversations TO authenticated;
GRANT ALL ON public.aria_conversations TO service_role;
ALTER TABLE public.aria_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_self_select" ON public.aria_conversations;
DROP POLICY IF EXISTS "conversations_self_insert" ON public.aria_conversations;
DROP POLICY IF EXISTS "conversations_self_update" ON public.aria_conversations;
DROP POLICY IF EXISTS "conversations_self_delete" ON public.aria_conversations;
CREATE POLICY "conversations_self_select" ON public.aria_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conversations_self_insert" ON public.aria_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_self_update" ON public.aria_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_self_delete" ON public.aria_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS aria_conversations_user_idx ON public.aria_conversations(user_id, last_message_at DESC);

-- ============ aria_preferences ==============================================
-- One row per user. ARIA reads these to personalize language, voice, theme.
CREATE TABLE IF NOT EXISTS public.aria_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  daily_brief_enabled BOOLEAN NOT NULL DEFAULT true,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_preferences TO authenticated;
GRANT ALL ON public.aria_preferences TO service_role;
ALTER TABLE public.aria_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preferences_self_select" ON public.aria_preferences;
DROP POLICY IF EXISTS "preferences_self_insert" ON public.aria_preferences;
DROP POLICY IF EXISTS "preferences_self_update" ON public.aria_preferences;
DROP POLICY IF EXISTS "preferences_self_delete" ON public.aria_preferences;
CREATE POLICY "preferences_self_select" ON public.aria_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "preferences_self_insert" ON public.aria_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preferences_self_update" ON public.aria_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preferences_self_delete" ON public.aria_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ aria_learning_log =============================================
-- The weekly self-improvement loop appends here whenever ARIA fails to answer
-- well (low confidence, thumbs-down, or empty RAG). The Sunday cron mines this
-- to propose new aria_knowledge. Users see only their own rows; the service
-- role (cron) reads across users to learn org-wide.
CREATE TABLE IF NOT EXISTS public.aria_learning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  failure_reason TEXT NOT NULL DEFAULT 'unknown',
  intent TEXT,
  rating SMALLINT CHECK (rating IN (-1, 0, 1)),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_learning_log TO authenticated;
GRANT ALL ON public.aria_learning_log TO service_role;
ALTER TABLE public.aria_learning_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "learning_self_select" ON public.aria_learning_log;
DROP POLICY IF EXISTS "learning_self_insert" ON public.aria_learning_log;
DROP POLICY IF EXISTS "learning_self_update" ON public.aria_learning_log;
CREATE POLICY "learning_self_select" ON public.aria_learning_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "learning_self_insert" ON public.aria_learning_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learning_self_update" ON public.aria_learning_log FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS aria_learning_log_unresolved_idx ON public.aria_learning_log(resolved, created_at DESC);
