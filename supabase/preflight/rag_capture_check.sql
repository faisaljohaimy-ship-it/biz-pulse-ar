-- ============================================================================
-- READ-SIDE CAPTURE — live verification harness (NOT a migration)
--
-- Runs the REAL capture function, the REAL privilege model and the REAL
-- watermark against a throwaway Postgres. The claims in migration 8's header
-- are asserted here as executed tests, not restated as prose.
--
-- pgvector is absent in the sandbox, so rag_chunks is created WITHOUT its
-- embedding column (a probe). Everything under test is \i-included verbatim.
--
-- Proven here:
--   I.    an authenticated session CANNOT execute capture (privilege denied)
--         — the constitutional "never inside a user request path", enforced
--   II.   unresolved failures become gaps; resolved ones do not
--   III.  an AMBIGUOUS org (user in two orgs) is SKIPPED, never guessed
--   IV.   NEGATIVE: rag_chunks / rag_documents / rag_candidates UNCHANGED
--   V.    two spellings in one batch collapse to one gap (hit_count = 2)
--   VI.   a second run is idempotent: watermark held, zero new gaps
--   VII.  conversations are SCANNED but mint ZERO gaps (the design refusal)
--   VIII. simulation conversations are excluded from the scan
-- ============================================================================
begin;
set search_path = public, extensions;
create schema if not exists extensions;
create schema if not exists auth;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Platform stubs (verbatim helper bodies) ───────────────────────────────
create type public.org_role as enum ('owner','admin','manager','operator','viewer');
create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null, role public.org_role not null default 'operator',
  joined_at timestamptz not null default now(), unique (org_id, user_id)
);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub')::uuid;
$$;
create function public.current_org_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,current_org}','')::uuid,
    (select org_id from public.org_members where user_id = auth.uid() order by joined_at limit 1));
$$;
create function public.is_org_member(_org uuid, _min_role public.org_role default 'viewer')
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m
    where m.org_id = _org and m.user_id = auth.uid()
      and case _min_role
        when 'viewer'   then m.role in ('viewer','operator','manager','admin','owner')
        when 'operator' then m.role in ('operator','manager','admin','owner')
        when 'manager'  then m.role in ('manager','admin','owner')
        when 'admin'    then m.role in ('admin','owner')
        when 'owner'    then m.role = 'owner' end);
$$;
create function public.update_updated_at_column() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
grant usage on schema public, extensions to authenticated, service_role;

-- ── The EXISTING conversation tables the job reads. Real shape, verbatim
--    columns from 20260712100000_aria_conversations_preferences_learning.sql.
--    They are READ ONLY here: nothing under test writes to them, which is the
--    whole point of "read-side".
create table public.aria_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id text not null,
  title text not null default 'محادثة جديدة',
  message_count integer not null default 0,
  last_message_at timestamptz not null default now(),
  is_simulation boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, thread_id)
);
create table public.aria_learning_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  question text not null,
  failure_reason text not null default 'unknown',
  intent text,
  rating smallint check (rating in (-1,0,1)),
  resolved boolean not null default false,
  resolution_note text,
  created_at timestamptz not null default now()
);

\i :normalize_file
\i :documents_file

create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  document_id uuid not null,
  chunk_index int not null,
  content text not null,
  is_simulation boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (document_id, org_id) references public.rag_documents (id, org_id) on delete cascade,
  unique (document_id, chunk_index)
);
alter table public.rag_chunks enable row level security;
grant select on public.rag_chunks to authenticated;

\i :loop_file
\i :hardening_file
\i :capture_file

-- ── Fixtures ──────────────────────────────────────────────────────────────
-- u1 : org A only            → resolvable
-- u2 : org A AND org B       → AMBIGUOUS, must be skipped
-- u3 : no membership at all  → unresolvable, must be skipped
insert into public.organizations (id,name,slug) values
  ('00000000-0000-0000-0000-00000000aaaa','Org A','org-a'),
  ('00000000-0000-0000-0000-00000000bbbb','Org B','org-b');
insert into public.org_members (org_id,user_id,role) values
  ('00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000a0001','viewer'),
  ('00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000a0002','viewer'),
  ('00000000-0000-0000-0000-00000000bbbb','00000000-0000-0000-0000-0000000a0002','viewer');

insert into public.rag_documents (id,org_id,doc_type,code,title,source,content_sha256) values
  ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000aaaa','sec','SEC-18','محطات التحويل','hcis.gov.sa',repeat('a',64));
insert into public.rag_chunks (id,org_id,document_id,chunk_index,content) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000000d1',0,'نص مقطع');

insert into public.aria_learning_log (user_id,question,failure_reason,resolved,created_at) values
  -- u1, two spellings of the SAME question → must collapse into one gap
  ('00000000-0000-0000-0000-0000000a0001','ما اشتراطات الأسوار الأمنية؟','insufficient_evidence',false,'2026-07-20 10:00Z'),
  ('00000000-0000-0000-0000-0000000a0001','ما اشتراطات الاسوار الأمنيّة؟','insufficient_evidence',false,'2026-07-20 10:05Z'),
  -- u1, a distinct question
  ('00000000-0000-0000-0000-0000000a0001','كم مرحلة في دورة الاعتماد؟','insufficient_evidence',false,'2026-07-20 11:00Z'),
  -- u1, ALREADY RESOLVED → must NOT become a gap
  ('00000000-0000-0000-0000-0000000a0001','سؤال محلول مسبقاً','low_confidence',true,'2026-07-20 12:00Z'),
  -- u2, ambiguous org → skipped
  ('00000000-0000-0000-0000-0000000a0002','سؤال من عضو في مؤسستين','insufficient_evidence',false,'2026-07-20 13:00Z'),
  -- u3, no org → skipped
  ('00000000-0000-0000-0000-0000000a0003','سؤال من مستخدم بلا مؤسسة','insufficient_evidence',false,'2026-07-20 14:00Z');

insert into public.aria_conversations (user_id,thread_id,title,is_simulation,last_message_at) values
  ('00000000-0000-0000-0000-0000000a0001','t1','ما اشتراطات الأسوار الأمنية؟',false,'2026-07-20 10:05Z'),
  ('00000000-0000-0000-0000-0000000a0001','t2','محادثة جديدة',false,'2026-07-20 11:00Z'),
  ('00000000-0000-0000-0000-0000000a0001','t3','محادثة محاكاة',true, '2026-07-20 11:30Z');

-- ── I. capture is UNREACHABLE from a user session ─────────────────────────
-- The constitution says capture may never run inside a user request path.
-- That is a privilege here, so a session role literally cannot call it.
do $$ declare denied_auth boolean := false; denied_anon boolean := false; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0001"}',true);
  execute 'set local role authenticated';
  begin perform public.rag_capture_readside(10);
  exception when insufficient_privilege then denied_auth := true; end;
  execute 'reset role';
  execute 'set local role anon';
  begin perform public.rag_capture_readside(10);
  exception when insufficient_privilege then denied_anon := true; end;
  execute 'reset role';
  assert denied_auth, 'I. an AUTHENTICATED session could execute capture';
  assert denied_anon, 'I. an ANON session could execute capture';
  raise notice 'I.    capture from user session . DENIED (authenticated + anon)';
end $$;

-- ── Baselines for the negative test ───────────────────────────────────────
create temp table _baseline as
  select (select count(*) from public.rag_chunks)     as chunks,
         (select count(*) from public.rag_documents)  as documents,
         (select count(*) from public.rag_candidates) as candidates;

-- ── First run ─────────────────────────────────────────────────────────────
create temp table _run1 as select * from public.rag_capture_readside(500);

-- ── II. unresolved → gaps; resolved → not ─────────────────────────────────
do $$ declare r record; resolved_leak int; begin
  select * into r from _run1 where source='aria_learning_log';
  -- 5 unresolved rows scanned (the resolved one is filtered out entirely)
  assert r.rows_scanned = 5, format('II. expected 5 scanned, got %s', r.rows_scanned);
  select count(*) into resolved_leak from public.rag_gaps
   where public.nx_ar_normalize(query) = public.nx_ar_normalize('سؤال محلول مسبقاً');
  assert resolved_leak = 0, 'II. an ALREADY-RESOLVED question became a gap';
  raise notice 'II.   unresolved → gaps ......... scanned=% recorded=% (resolved excluded)',
    r.rows_scanned, r.gaps_recorded;
end $$;

-- ── III. ambiguous / absent org is SKIPPED, never guessed ─────────────────
do $$ declare r record; guessed int; begin
  select * into r from _run1 where source='aria_learning_log';
  assert r.skipped_no_org = 2,
    format('III. expected 2 skipped (ambiguous + orgless), got %s', r.skipped_no_org);
  select count(*) into guessed from public.rag_gaps
   where query in ('سؤال من عضو في مؤسستين','سؤال من مستخدم بلا مؤسسة');
  assert guessed = 0, 'III. a question was filed under a GUESSED org';
  raise notice 'III.  ambiguous / no org ........ SKIPPED=% and filed nowhere', r.skipped_no_org;
end $$;

-- ── IV. NEGATIVE: the corpus is untouched ─────────────────────────────────
-- The whole poisoning argument rests on this: an automated reader of model
-- conversations must not be able to deposit anything into the corpus.
do $$ declare b record; c bigint; d bigint; k bigint; begin
  select * into b from _baseline;
  select count(*) into k from public.rag_chunks;
  select count(*) into d from public.rag_documents;
  select count(*) into c from public.rag_candidates;
  assert k = b.chunks,     format('IV. rag_chunks changed %s → %s', b.chunks, k);
  assert d = b.documents,  format('IV. rag_documents changed %s → %s', b.documents, d);
  assert c = b.candidates, format('IV. rag_candidates changed %s → %s', b.candidates, c);
  raise notice 'IV.   corpus after capture ...... UNCHANGED chunks=% documents=% candidates=%  <-- NEGATIVE TEST',
    k, d, c;
end $$;

-- ── V. two spellings in one batch collapse into one gap ───────────────────
do $$ declare g record; n int; begin
  select count(*) into n from public.rag_gaps
   where org_id='00000000-0000-0000-0000-00000000aaaa';
  assert n = 2, format('V. expected 2 distinct gaps for org A, got %s', n);
  select * into g from public.rag_gaps
   where org_id='00000000-0000-0000-0000-00000000aaaa'
   order by hit_count desc limit 1;
  assert g.hit_count = 2,
    format('V. the two spellings did not merge (hit_count=%s)', g.hit_count);
  raise notice 'V.    in-batch normalisation .... 2 spellings → 1 gap, hit_count=%', g.hit_count;
end $$;

-- ── VI. second run is idempotent ──────────────────────────────────────────
do $$ declare r record; before_n int; after_n int; before_hits int; after_hits int; begin
  select count(*), coalesce(sum(hit_count),0) into before_n, before_hits from public.rag_gaps;
  create temp table _run2 as select * from public.rag_capture_readside(500);
  select * into r from _run2 where source='aria_learning_log';
  select count(*), coalesce(sum(hit_count),0) into after_n, after_hits from public.rag_gaps;
  assert r.rows_scanned = 0, format('VI. second run rescanned %s rows', r.rows_scanned);
  assert after_n = before_n and after_hits = before_hits,
    format('VI. second run mutated gaps (%s/%s → %s/%s)', before_n, before_hits, after_n, after_hits);
  raise notice 'VI.   re-run at watermark ....... scanned=0, gaps unchanged (%, hits=%)',
    after_n, after_hits;
end $$;

-- ── VII. conversations scanned, ZERO gaps minted ──────────────────────────
-- The recorded design refusal, executed: a conversation TITLE is demand, not
-- failure, and must never inflate the failure ledger.
do $$ declare r record; titled int; begin
  select * into r from _run1 where source='aria_conversations';
  assert r.rows_scanned = 2,
    format('VII. expected 2 real conversations scanned, got %s', r.rows_scanned);
  assert r.gaps_recorded = 0, 'VII. conversations MINTED gaps — the refusal was not honoured';
  select count(*) into titled from public.rag_gaps
   where public.nx_ar_normalize(query) = public.nx_ar_normalize('محادثة جديدة');
  assert titled = 0, 'VII. a conversation title leaked into the gap backlog';
  raise notice 'VII.  conversations ............. scanned=% gaps_minted=% (demand ≠ failure)',
    r.rows_scanned, r.gaps_recorded;
end $$;

-- ── VIII. simulation conversations excluded ───────────────────────────────
do $$ declare r record; begin
  select * into r from _run1 where source='aria_conversations';
  -- 3 rows exist; 1 is is_simulation → exactly 2 scanned (asserted in VII).
  assert r.watermark = '2026-07-20 11:00Z'::timestamptz,
    format('VIII. watermark took the SIMULATION row (%s)', r.watermark);
  raise notice 'VIII. simulation rows ........... EXCLUDED (watermark stopped at %)', r.watermark;
end $$;

-- ── IX. a batch boundary that lands mid-tie loses NOTHING ────────────────
-- Three failures share one timestamp exactly. Scanned one at a time, a bare
-- `created_at > mark` cursor jumps past the other two forever. The keyset
-- cursor (created_at, id) resumes inside the tie. This assertion fails on the
-- timestamp-only cursor and passes on the keyset one.
do $$ declare r record; total int := 0; guard int := 0; begin
  insert into public.aria_learning_log (user_id,question,failure_reason,resolved,created_at) values
    ('00000000-0000-0000-0000-0000000a0001','سؤال متزامن أول','insufficient_evidence',false,'2026-07-21 08:00:00+00'),
    ('00000000-0000-0000-0000-0000000a0001','سؤال متزامن ثانٍ','insufficient_evidence',false,'2026-07-21 08:00:00+00'),
    ('00000000-0000-0000-0000-0000000a0001','سؤال متزامن ثالث','insufficient_evidence',false,'2026-07-21 08:00:00+00');

  -- Drain one row per call, so every call ends exactly on the tie.
  LOOP
    guard := guard + 1;
    SELECT * INTO r FROM public.rag_capture_readside(1) WHERE source='aria_learning_log';
    EXIT WHEN r.rows_scanned = 0 OR guard > 10;
    total := total + r.rows_scanned;
  END LOOP;

  assert total = 3,
    format('IX. batch boundary inside a timestamp tie lost rows: drained %s of 3', total);
  raise notice 'IX.   tie at the batch boundary ... all 3 drained one-by-one (keyset cursor)';
end $$;

do $$ begin raise notice '──── READ-SIDE CAPTURE CHECKS PASSED (I–IX) ────'; end $$;
rollback;
