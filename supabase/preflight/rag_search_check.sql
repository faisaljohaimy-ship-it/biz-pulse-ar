-- ============================================================================
-- RAG session-2 — local verification harness (NOT a migration; never shipped)
--
-- Extends session-1's harness pattern for the search/ingest layer. pgvector is
-- NOT installed in this sandbox, so the REAL rag_hybrid_search (whose signature
-- carries extensions.vector(1536)) cannot even be created locally — that
-- creation is verified on Supabase via the runbook's file-5 check. What IS
-- verified here, for real:
--   F. the ingest idempotency guards (unique partial indexes — the exact
--      statements from migration 5) reject a duplicate document LOUDLY.
--   G. the RRF fusion SQL shape over the two locally-runnable paths
--      (Arabic FTS + strict_word_similarity trgm), same math as migration 5:
--      Σ w/(60+rank) — ordering + matched_paths + exact top score asserted.
-- Each check RAISES on failure (ON_ERROR_STOP → non-zero exit = real fail).
-- ============================================================================
begin;
set search_path = public, extensions;
create schema if not exists extensions;
create schema if not exists auth;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Faithful platform stubs (same as session-1 harness) ───────────────────
create type public.org_role as enum ('owner', 'admin', 'manager', 'operator', 'viewer');
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null, role public.org_role not null default 'operator',
  joined_at timestamptz not null default now(), unique (org_id, user_id)
);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;
create function public.current_org_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,current_org}', '')::uuid,
    (select org_id from public.org_members where user_id = auth.uid() order by joined_at limit 1)
  );
$$;
create function public.is_org_member(_org uuid, _min_role public.org_role default 'viewer')
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = _org and m.user_id = auth.uid()
      and case _min_role
        when 'viewer'   then m.role in ('viewer','operator','manager','admin','owner')
        when 'operator' then m.role in ('operator','manager','admin','owner')
        when 'manager'  then m.role in ('manager','admin','owner')
        when 'admin'    then m.role in ('admin','owner')
        when 'owner'    then m.role = 'owner'
      end
  );
$$;
create function public.update_updated_at_column() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create role authenticated nologin;
create role service_role nologin;
grant usage on schema public, extensions to authenticated;

-- ── REAL migrations under test (2 + 3) ────────────────────────────────────
\i :normalize_file
\i :documents_file

-- ── F. ingest idempotency guards — EXACT statements from migration 5 ──────
create unique index if not exists rag_documents_org_code_uq
  on public.rag_documents (org_id, doc_type, code)
  where code is not null;
create unique index if not exists rag_documents_org_source_title_uq
  on public.rag_documents (org_id, source, title)
  where code is null;

insert into public.organizations (id, name, slug)
  values ('00000000-0000-0000-0000-00000000aaaa', 'Org A', 'org-a');
insert into public.rag_documents (org_id, doc_type, code, title, source, content_sha256)
  values ('00000000-0000-0000-0000-00000000aaaa', 'sec', 'SEC-18',
          'توجيه السلامة', 'hcis.gov.sa', repeat('a', 64));

do $$
begin
  begin
    insert into public.rag_documents (org_id, doc_type, code, title, source, content_sha256)
      values ('00000000-0000-0000-0000-00000000aaaa', 'sec', 'SEC-18',
              'نسخة مكررة', 'hcis.gov.sa', repeat('b', 64));
    raise exception 'duplicate (org, doc_type, code) was ACCEPTED — guard missing';
  exception when unique_violation then
    raise notice 'F. idempotency guard ..... PASS (duplicate doc rejected loudly)';
  end;
end $$;

-- ── G. RRF fusion probe — two locally-runnable paths, same math as mig. 5 ──
create table public.rag_chunks_probe (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  document_id uuid not null,
  chunk_index int not null,
  content text not null,
  content_norm text     generated always as (public.nx_ar_normalize(content)) stored,
  tsv          tsvector generated always as (to_tsvector('simple', public.nx_ar_normalize(content))) stored,
  foreign key (document_id, org_id) references public.rag_documents (id, org_id) on delete cascade
);
create index on public.rag_chunks_probe using gin (tsv);
create index on public.rag_chunks_probe using gin (content_norm extensions.gin_trgm_ops);

insert into public.rag_documents (id, org_id, doc_type, code, title, source, content_sha256)
  values ('00000000-0000-0000-0000-00000000d0a1', '00000000-0000-0000-0000-00000000aaaa',
          'ptw', 'PTW-01', 'تصريح العمل', 'internal', repeat('c', 64));
insert into public.rag_chunks_probe (org_id, document_id, chunk_index, content) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000d0a1', 0,
   'اشتراطات تصريح العمل في المحطات: اعتماد مشرف الموقع ثم السلامة ثم مدير المنطقة.'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000d0a1', 1,
   'إجراءات الصيانة الدورية للمولدات لا تتطلب إخلاء المبنى.'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000d0a1', 2,
   'سجل الزوار اليومي يُراجع كل مساء.');

-- Two-path RRF (fts w=1.0 · trgm w=0.5, k=60) — the vec CTE of migration 5 is
-- absent here ONLY because pgvector is absent in the sandbox.
create function public.rag_fusion_probe(_query text, _match_count int default 8)
returns table (chunk_index int, rrf_score numeric, matched_paths int)
language sql stable set search_path = public, extensions as $$
  with params as (
    select public.nx_ar_normalize(coalesce(_query,'')) as qnorm,
           least(greatest(coalesce(_match_count,8),1),24) as k_final,
           least(greatest(coalesce(_match_count,8)*4,24),96) as pool
  ),
  fts as (
    select s.id, row_number() over (order by s.rank desc) as r
    from (
      select c.id, ts_rank_cd(c.tsv, websearch_to_tsquery('simple', p.qnorm)) as rank
      from public.rag_chunks_probe c, params p
      where p.qnorm <> '' and c.tsv @@ websearch_to_tsquery('simple', p.qnorm)
      order by rank desc limit (select pool from params)
    ) s
  ),
  trgm as (
    select s.id, row_number() over (order by s.sim desc) as r
    from (
      select c.id, extensions.strict_word_similarity(p.qnorm, c.content_norm) as sim
      from public.rag_chunks_probe c, params p
      where p.qnorm <> '' and p.qnorm <<% c.content_norm
      order by sim desc limit (select pool from params)
    ) s
  ),
  united as (
    select id, r, 1.0::numeric as w from fts
    union all
    select id, r, 0.5::numeric from trgm
  ),
  fused as (
    select id, sum(w / (60 + r))::numeric as score, count(*)::int as paths
    from united group by id
  )
  select c.chunk_index, f.score, f.paths
  from fused f join public.rag_chunks_probe c on c.id = f.id
  order by f.score desc, c.chunk_index
  limit (select k_final from params);
$$;

do $$
declare top record; expected numeric;
begin
  -- G1: tashkeel-variant query whose every normalized term exists in chunk 0 →
  -- corroborated by BOTH paths (FTS + word-similarity), rank 1 on each.
  select * into top from public.rag_fusion_probe('اشتراطات تصريحُ العمل') limit 1;
  assert top.chunk_index = 0, format('expected chunk 0 on top, got %s', top.chunk_index);
  assert top.matched_paths = 2, format('expected 2 corroborating paths, got %s', top.matched_paths);
  -- Exact RRF math at rank 1 on both paths: 1.0/(60+1) + 0.5/(60+1)
  expected := round(1.0/61 + 0.5/61, 12);
  assert round(top.rrf_score, 12) = expected,
    format('RRF score %s <> expected %s', round(top.rrf_score,12), expected);
  raise notice 'G1. RRF fusion ........... PASS (top=chunk %, paths=%, score=%)',
    top.chunk_index, top.matched_paths, round(top.rrf_score, 6);
end $$;

do $$
declare top record;
begin
  -- G2: DESIGN PROOF — a query with one term absent from the corpus
  -- («بالمحطه» vs «المحطات») drops the AND-semantics FTS path entirely;
  -- the word-similarity path still recovers the chunk (measured 0.72 ≥ 0.5).
  -- Single-path → the edge evidence bar correctly calls it insufficient
  -- (in production the VECTOR path would corroborate semantically).
  select * into top from public.rag_fusion_probe('اشتراطات تصريحُ العملِ بالمحطة') limit 1;
  assert top.chunk_index = 0, format('expected chunk 0 on top, got %s', top.chunk_index);
  assert top.matched_paths = 1, format('expected trgm-only (1 path), got %s', top.matched_paths);
  raise notice 'G2. AND-semantics proof .. PASS (variant term → trgm-only, paths=%)',
    top.matched_paths;
end $$;

do $$
declare n int;
begin
  -- An off-corpus query returns nothing on either path → the edge layer's
  -- hasSufficientEvidence([]) = false → insufficient_evidence.
  select count(*) into n from public.rag_fusion_probe('ميزانية التسويق الرقمي للربع القادم');
  assert n = 0, format('off-corpus query should return 0 rows, got %s', n);
  raise notice 'H. off-corpus → empty .... PASS (0 rows → insufficient_evidence)';
end $$;

do $$ begin raise notice '──────── SESSION-2 LOCAL CHECKS PASSED (F–H) ────────'; end $$;
rollback;
