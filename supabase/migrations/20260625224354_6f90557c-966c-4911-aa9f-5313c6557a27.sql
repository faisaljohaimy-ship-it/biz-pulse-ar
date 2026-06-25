
CREATE OR REPLACE FUNCTION public.aria_match_memory(
  _user_id UUID,
  _query vector(768),
  _scope TEXT DEFAULT NULL,
  _limit INT DEFAULT 6
) RETURNS TABLE (id UUID, scope TEXT, key TEXT, content TEXT, importance NUMERIC, similarity NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT k.id, k.title, k.source, k.content, k.tags,
         1 - (k.embedding <=> _query) AS similarity
  FROM public.aria_knowledge k
  WHERE k.embedding IS NOT NULL
    AND (_tags IS NULL OR k.tags && _tags)
  ORDER BY k.embedding <=> _query
  LIMIT _limit;
$$;
