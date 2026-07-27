-- ============================================================================
-- RAG layer — local verification harness (NOT a migration; never shipped to DB)
--
-- Runs against a THROWAWAY local Postgres (see the runner in the report). It
-- reproduces the platform's org helpers faithfully, \i-includes the REAL
-- normalize + rag_documents migrations, and asserts:
--   A. nx_ar_normalize — alef / ta-marbuta / tashkeel / tatweel / maqsura / lower
--   B. Arabic FTS (simple over normalized) matches across orthographic variants
--   C. pg_trgm fuzzy similarity over normalized text
--   D. sha256 content_hash is present and correct
--   E. RLS org isolation — user in org A cannot see org B rows
--
-- The vector(1536)/HNSW column is pgvector-dependent; pgvector is NOT installed
-- in this sandbox, so the chunk PROBE below mirrors rag_chunks MINUS the vector
-- column. HNSW/vector search is exercised only on Supabase (which has pgvector).
-- Each check RAISES on failure (psql ON_ERROR_STOP → non-zero exit = real fail).
-- ============================================================================
begin;
set search_path = public, extensions;
create schema if not exists extensions;
create schema if not exists auth;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Faithful stubs of the EXISTING platform objects the migrations depend on ──
create type public.org_role as enum ('owner', 'admin', 'manager', 'operator', 'viewer');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.org_role not null default 'operator',
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- auth.uid() reads the JWT sub GUC, exactly like Supabase (null for a guest).
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

-- Verbatim copies of the real helpers (same bodies recon'd from the migrations).
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
create role service_role nologin;      -- exists on Supabase; needed for the GRANTs
grant usage on schema public, extensions to authenticated;

-- ── Include the REAL migrations under test ────────────────────────────────
\i :normalize_file
\i :documents_file

-- ── Chunk PROBE: mirrors rag_chunks MINUS the vector column (pgvector absent) ──
create table public.rag_chunks_probe (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  document_id uuid not null,
  chunk_index int not null,
  content text not null,
  content_norm text     generated always as (public.nx_ar_normalize(content)) stored,
  tsv          tsvector generated always as (to_tsvector('simple', public.nx_ar_normalize(content))) stored,
  content_hash text     generated always as (encode(extensions.digest(content, 'sha256'), 'hex')) stored,
  foreign key (document_id, org_id) references public.rag_documents (id, org_id) on delete cascade,
  unique (document_id, chunk_index)
);
create index rag_chunks_probe_tsv_gin  on public.rag_chunks_probe using gin (tsv);
create index rag_chunks_probe_trgm_gin on public.rag_chunks_probe using gin (content_norm extensions.gin_trgm_ops);
alter table public.rag_chunks_probe enable row level security;
create policy probe_read on public.rag_chunks_probe for select to authenticated
  using (public.is_org_member(org_id, 'viewer'));
grant select on public.rag_chunks_probe to authenticated;

-- ── A. normalization assertions ───────────────────────────────────────────
do $$ begin
  assert public.nx_ar_normalize('أحمد')        = 'احمد',    'alef hamza';
  assert public.nx_ar_normalize('إسلام')       = 'اسلام',   'alef kasra';
  assert public.nx_ar_normalize('مكتبة')       = 'مكتبه',   'ta marbuta';
  assert public.nx_ar_normalize('السَّلامة')    = 'السلامه', 'tashkeel (shadda+fatha) + ta marbuta';
  assert public.nx_ar_normalize('ســلامة')     = 'سلامه',   'tatweel removed';
  assert public.nx_ar_normalize('على')         = 'علي',     'alef maqsura';
  assert public.nx_ar_normalize('SEC-18')      = 'sec-18',  'latin lower';
  assert public.nx_ar_normalize(null) is null,             'strict null';
  raise notice 'A. normalization ....... PASS (8 cases)';
end $$;

-- ── seed two orgs + a document each, then chunks ──────────────────────────
insert into public.organizations (id, name, slug) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Org A', 'org-a'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Org B', 'org-b');
insert into public.org_members (org_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000a0001', 'admin'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000b0001', 'admin');

insert into public.rag_documents (id, org_id, doc_type, code, title, source, content_sha256) values
  ('00000000-0000-0000-0000-00000000d0a1', '00000000-0000-0000-0000-00000000aaaa', 'sec', 'SEC-18',
   'توجيه السلامة', 'hcis.gov.sa', repeat('a', 64)),
  ('00000000-0000-0000-0000-00000000d0b1', '00000000-0000-0000-0000-00000000bbbb', 'sec', 'SEC-18',
   'توجيه السلامة', 'hcis.gov.sa', repeat('b', 64));

insert into public.rag_chunks_probe (org_id, document_id, chunk_index, content) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000d0a1', 0,
   'إجراءات السَّلامة الصناعية في المحطة الغربية'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-00000000d0b1', 0,
   'إجراءات السلامة الصناعية في المحطة الشرقية');

-- ── B. FTS matches across an orthographic variant (tashkeel-laden query) ───
do $$ declare n int; begin
  select count(*) into n from public.rag_chunks_probe
   where tsv @@ plainto_tsquery('simple', public.nx_ar_normalize('السّلامة'));
  assert n = 2, format('FTS expected 2 rows, got %s', n);
  raise notice 'B. arabic FTS ........... PASS (variant «السّلامة» matched %) ', n;
end $$;

-- ── C. pg_trgm fuzzy similarity over normalized text (typo tolerance) ──────
do $$ declare s real; begin
  select max(similarity(content_norm, public.nx_ar_normalize('السلامه الصناعيه')))
    into s from public.rag_chunks_probe;
  assert s > 0.3, format('trgm similarity too low: %s', s);
  raise notice 'C. pg_trgm fuzzy ........ PASS (max similarity %)', round(s::numeric, 3);
end $$;

-- ── D. sha256 content_hash present and correct ────────────────────────────
do $$ declare ok boolean; begin
  select bool_and(content_hash = encode(extensions.digest(content, 'sha256'), 'hex')
                  and length(content_hash) = 64)
    into ok from public.rag_chunks_probe;
  assert ok, 'content_hash mismatch/length';
  raise notice 'D. sha256 content_hash .. PASS';
end $$;

-- ── E. RLS ISOLATION — user in org A sees org A only, never org B ─────────
do $$ declare visible int; other int; begin
  perform set_config('request.jwt.claims',
                     '{"sub":"00000000-0000-0000-0000-0000000a0001"}', true);
  execute 'set local role authenticated';
  select count(*) into visible from public.rag_documents
    where org_id = '00000000-0000-0000-0000-00000000aaaa';
  select count(*) into other   from public.rag_documents
    where org_id = '00000000-0000-0000-0000-00000000bbbb';
  execute 'reset role';
  assert visible = 1, format('org A should see its 1 doc, saw %s', visible);
  assert other   = 0, format('org A must NOT see org B docs, saw %s', other);
  raise notice 'E. RLS documents isolation PASS (A sees % / B leak %)', visible, other;
end $$;

do $$ declare leak int; begin
  perform set_config('request.jwt.claims',
                     '{"sub":"00000000-0000-0000-0000-0000000a0001"}', true);
  execute 'set local role authenticated';
  select count(*) into leak from public.rag_chunks_probe
    where org_id = '00000000-0000-0000-0000-00000000bbbb';
  execute 'reset role';
  assert leak = 0, format('org A must NOT see org B chunks, saw %s', leak);
  raise notice 'E. RLS chunks isolation .. PASS (B chunk leak %)', leak;
end $$;

do $$ begin raise notice '──────── ALL LOCAL CHECKS PASSED (A–E) ────────'; end $$;
rollback;  -- throwaway; leave no state
