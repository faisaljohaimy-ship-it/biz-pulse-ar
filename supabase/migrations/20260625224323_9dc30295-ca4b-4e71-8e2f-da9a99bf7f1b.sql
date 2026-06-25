
-- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ aria_memory ============
CREATE TABLE IF NOT EXISTS public.aria_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  importance NUMERIC NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_memory TO authenticated;
GRANT ALL ON public.aria_memory TO service_role;
ALTER TABLE public.aria_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memory_self_select" ON public.aria_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "memory_self_insert" ON public.aria_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memory_self_update" ON public.aria_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memory_self_delete" ON public.aria_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS aria_memory_user_idx ON public.aria_memory(user_id, scope);
CREATE INDEX IF NOT EXISTS aria_memory_embedding_idx ON public.aria_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============ aria_knowledge ============
CREATE TABLE IF NOT EXISTS public.aria_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aria_knowledge TO authenticated;
GRANT ALL ON public.aria_knowledge TO service_role;
ALTER TABLE public.aria_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_authenticated_read" ON public.aria_knowledge FOR SELECT TO authenticated USING (true);
CREATE POLICY "knowledge_admin_write" ON public.aria_knowledge FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS aria_knowledge_embedding_idx ON public.aria_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS aria_knowledge_tags_idx ON public.aria_knowledge USING gin (tags);

-- ============ aria_reports ============
CREATE TABLE IF NOT EXISTS public.aria_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('executive','daily','weekly','monthly','incident','risk','operations','board')),
  title TEXT NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  markdown TEXT NOT NULL DEFAULT '',
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_reports TO authenticated;
GRANT ALL ON public.aria_reports TO service_role;
ALTER TABLE public.aria_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_self_select" ON public.aria_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reports_self_insert" ON public.aria_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_self_update" ON public.aria_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_self_delete" ON public.aria_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS aria_reports_user_kind_idx ON public.aria_reports(user_id, kind, created_at DESC);

-- ============ aria_decisions ============
CREATE TABLE IF NOT EXISTS public.aria_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID,
  recommendation TEXT NOT NULL,
  rationale TEXT,
  confidence NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  executed_tool TEXT,
  tool_payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','executed','dismissed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_decisions TO authenticated;
GRANT ALL ON public.aria_decisions TO service_role;
ALTER TABLE public.aria_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions_self_select" ON public.aria_decisions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "decisions_self_insert" ON public.aria_decisions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "decisions_self_update" ON public.aria_decisions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "decisions_self_delete" ON public.aria_decisions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS aria_decisions_user_idx ON public.aria_decisions(user_id, status, created_at DESC);

-- ============ extend threads ============
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

-- ============ extend messages ============
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS stage_trace JSONB,
  ADD COLUMN IF NOT EXISTS tool_calls JSONB,
  ADD COLUMN IF NOT EXISTS citations JSONB,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS tokens INTEGER;

-- ============ RPC: cosine similarity search ============
CREATE OR REPLACE FUNCTION public.aria_match_memory(
  _user_id UUID,
  _query vector(768),
  _scope TEXT DEFAULT NULL,
  _limit INT DEFAULT 6
) RETURNS TABLE (id UUID, scope TEXT, key TEXT, content TEXT, importance NUMERIC, similarity NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.scope, m.key, m.content, m.importance,
         1 - (m.embedding <=> _query) AS similarity
  FROM public.aria_memory m
  WHERE m.user_id = _user_id
    AND m.embedding IS NOT NULL
    AND (_scope IS NULL OR m.scope = _scope)
  ORDER BY m.embedding <=> _query
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.aria_match_knowledge(
  _query vector(768),
  _tags TEXT[] DEFAULT NULL,
  _limit INT DEFAULT 6
) RETURNS TABLE (id UUID, title TEXT, source TEXT, content TEXT, tags TEXT[], similarity NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.id, k.title, k.source, k.content, k.tags,
         1 - (k.embedding <=> _query) AS similarity
  FROM public.aria_knowledge k
  WHERE k.embedding IS NOT NULL
    AND (_tags IS NULL OR k.tags && _tags)
  ORDER BY k.embedding <=> _query
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.aria_match_memory(UUID, vector, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aria_match_knowledge(vector, TEXT[], INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aria_match_memory(UUID, vector, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aria_match_knowledge(vector, TEXT[], INT) TO authenticated, service_role;

-- updated_at triggers
DROP TRIGGER IF EXISTS aria_knowledge_updated_at ON public.aria_knowledge;
CREATE TRIGGER aria_knowledge_updated_at BEFORE UPDATE ON public.aria_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS aria_decisions_updated_at ON public.aria_decisions;
CREATE TRIGGER aria_decisions_updated_at BEFORE UPDATE ON public.aria_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
