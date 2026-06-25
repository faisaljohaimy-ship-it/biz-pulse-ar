
CREATE TABLE IF NOT EXISTS public.aria_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source text NOT NULL DEFAULT 'upload',
  mime_type text,
  storage_path text,
  size_bytes integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  page_count integer DEFAULT 0,
  chunk_count integer DEFAULT 0,
  summary text,
  tags text[] NOT NULL DEFAULT '{}',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aria_documents_user_idx ON public.aria_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aria_documents_tags_idx ON public.aria_documents USING gin(tags);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_documents TO authenticated;
GRANT ALL ON public.aria_documents TO service_role;
ALTER TABLE public.aria_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aria_documents_owner_select" ON public.aria_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "aria_documents_owner_insert" ON public.aria_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aria_documents_owner_update" ON public.aria_documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aria_documents_owner_delete" ON public.aria_documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER aria_documents_updated_at BEFORE UPDATE ON public.aria_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.aria_document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.aria_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aria_document_chunks_doc_idx ON public.aria_document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS aria_document_chunks_user_idx ON public.aria_document_chunks(user_id);
CREATE INDEX IF NOT EXISTS aria_document_chunks_embedding_idx
  ON public.aria_document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_document_chunks TO authenticated;
GRANT ALL ON public.aria_document_chunks TO service_role;
ALTER TABLE public.aria_document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aria_doc_chunks_owner_select" ON public.aria_document_chunks
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "aria_doc_chunks_owner_insert" ON public.aria_document_chunks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aria_doc_chunks_owner_delete" ON public.aria_document_chunks
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.aria_match_documents(
  _user_id uuid, _query vector(768), _limit integer DEFAULT 8
) RETURNS TABLE (
  chunk_id uuid, document_id uuid, title text, content text, similarity numeric
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT c.id, c.document_id, d.title, c.content,
         1 - (c.embedding <=> _query) AS similarity
  FROM public.aria_document_chunks c
  JOIN public.aria_documents d ON d.id = c.document_id
  WHERE c.user_id = _user_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> _query
  LIMIT _limit;
$$;
