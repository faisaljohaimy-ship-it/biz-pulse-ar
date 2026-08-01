-- FINN Gemini embedding contract (additive metadata correction only).
-- This migration changes defaults for FUTURE rows. It deliberately does not
-- relabel or reuse an existing vector: every historical corpus must be
-- re-embedded before FINN_GEMINI_RAG_READY can be enabled.

set local search_path = public, extensions;

do $$
begin
  if to_regclass('public.sec_knowledge_articles') is not null then
    alter table public.sec_knowledge_articles
      alter column embedding_model set default 'gemini-embedding-2';
  end if;

  if to_regclass('public.rag_chunks') is not null then
    alter table public.rag_chunks
      alter column embedding_model set default 'gemini-embedding-2';
  end if;
end
$$;

comment on column public.sec_knowledge_articles.embedding_model is
  'Embedding provenance. New FINN vectors use gemini-embedding-2; historical vectors retain their original label until re-embedded.';
