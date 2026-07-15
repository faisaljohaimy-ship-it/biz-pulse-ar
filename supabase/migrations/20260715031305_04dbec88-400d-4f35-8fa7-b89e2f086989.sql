-- Fix pgvector operator resolution in ARIA RAG functions.
-- The `<=>` operator lives in the `extensions` schema; the functions must
-- include it on their search_path to resolve at execution time.

CREATE OR REPLACE FUNCTION public.aria_match_memory(_user_id uuid, _query vector, _scope text DEFAULT NULL::text, _limit integer DEFAULT 6)
 RETURNS TABLE(id uuid, scope text, key text, content text, importance numeric, similarity numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT m.id, m.scope, m.key, m.content, m.importance,
         1 - (m.embedding <=> _query) AS similarity
  FROM public.aria_memory m
  WHERE m.user_id = _user_id
    AND m.embedding IS NOT NULL
    AND (_scope IS NULL OR m.scope = _scope)
  ORDER BY m.embedding <=> _query
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.aria_match_knowledge(_query vector, _tags text[] DEFAULT NULL::text[], _limit integer DEFAULT 6)
 RETURNS TABLE(id uuid, title text, source text, content text, tags text[], similarity numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT k.id, k.title, k.source, k.content, k.tags,
         1 - (k.embedding <=> _query) AS similarity
  FROM public.aria_knowledge k
  WHERE k.embedding IS NOT NULL
    AND (_tags IS NULL OR k.tags && _tags)
  ORDER BY k.embedding <=> _query
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.aria_match_documents(_user_id uuid, _query vector, _limit integer DEFAULT 8)
 RETURNS TABLE(chunk_id uuid, document_id uuid, title text, content text, similarity numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT c.id, c.document_id, d.title, c.content,
         1 - (c.embedding <=> _query) AS similarity
  FROM public.aria_document_chunks c
  JOIN public.aria_documents d ON d.id = c.document_id
  WHERE c.user_id = _user_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> _query
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.sec_kb_search(_query vector, _category_code text DEFAULT NULL::text, _limit integer DEFAULT 8)
 RETURNS TABLE(id uuid, doc_code text, title_ar text, title_en text, summary_ar text, summary_en text, category_code text, risk_level text, priority text, similarity numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT a.id, a.doc_code, a.title_ar, a.title_en,
         a.summary_ar, a.summary_en,
         c.code,
         a.risk_level, a.priority,
         (1 - (a.embedding <=> _query))::numeric AS similarity
  FROM public.sec_knowledge_articles a
  LEFT JOIN public.sec_knowledge_categories c ON c.id = a.category_id
  WHERE a.status = 'published'
    AND a.embedding IS NOT NULL
    AND (_category_code IS NULL OR c.code = _category_code)
  ORDER BY a.embedding <=> _query
  LIMIT _limit;
$function$;