-- ============================================================================
-- CONTINUOUS OPERATION (phase ⑤) — live verification harness (NOT a migration)
--
-- The claim under test is the honesty rule: an unmeasured system must be
-- INDISTINGUISHABLE from one that measured nothing, and both must be refused.
-- Asserting that in prose is worthless; it is asserted here by execution.
--
-- pgvector is absent in the sandbox, so rag_chunks carries a TEXT stand-in for
-- `embedding`. Nothing under test depends on the vector type — the staleness
-- predicate is `embedding is null or embedded_hash is distinct from
-- content_hash`, which is type-agnostic.
--
-- Proven here:
--   I.    empty ledger        → enable=false, blocked by 'not_measured'
--   II.   a score without measurement is REJECTED by the database
--   III.  21 measured < 30    → blocked, however good the scores
--   IV.   30 measured, both thresholds, verified corpus → enable=true
--   V.    perfect scores on an UNVERIFIED corpus → still blocked
--   VI.   health returns NULL (not 0) for what was never measured
--   VII.  re-embed queue classifies staleness, and reacts to a content edit
--   VIII. a member CANNOT insert a passing eval row (privilege revoked)
--   IX.   health is readable by a member and org-scoped
-- ============================================================================
begin;
set search_path = public, extensions;
create schema if not exists extensions;
create schema if not exists auth;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

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

\i :normalize_file
\i :documents_file

-- rag_chunks probe: REAL generated columns, TEXT stand-in for the vector.
create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org_id(),
  document_id uuid not null,
  chunk_index int not null,
  content text not null,
  content_hash text generated always as (encode(extensions.digest(content,'sha256'),'hex')) stored,
  embedding text,                       -- stand-in: pgvector absent in sandbox
  embedding_model text not null default 'gemini/gemini-embedding-001',
  embedding_dim int not null default 1536,
  is_simulation boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (document_id, org_id) references public.rag_documents (id, org_id) on delete cascade,
  unique (document_id, chunk_index)
);
alter table public.rag_chunks enable row level security;
create policy rag_chunks_member_read on public.rag_chunks
  for select to authenticated using (public.is_org_member(org_id,'viewer'));
create policy rag_chunks_admin_write on public.rag_chunks
  for all to authenticated using (public.is_org_member(org_id,'admin'))
  with check (public.is_org_member(org_id,'admin'));
grant select, insert, update on public.rag_chunks to authenticated;

\i :loop_file
\i :hardening_file
\i :operations_file

-- ── Fixtures ──────────────────────────────────────────────────────────────
insert into public.organizations (id,name,slug) values
  ('00000000-0000-0000-0000-00000000aaaa','Org A','org-a'),
  ('00000000-0000-0000-0000-00000000bbbb','Org B','org-b');
insert into public.org_members (org_id,user_id,role) values
  ('00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000a0001','admin'),
  ('00000000-0000-0000-0000-00000000bbbb','00000000-0000-0000-0000-0000000b0001','admin');
insert into public.rag_documents (id,org_id,doc_type,code,title,source,content_sha256) values
  ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000aaaa','sec','SEC-18','محطات التحويل','hcis.gov.sa',repeat('a',64));

-- ── I. empty ledger is REFUSED, and named as unmeasured ──────────────────
do $$ declare g record; begin
  select * into g from public.rag_should_enable();
  assert g.enable = false, 'I. an UNMEASURED system was cleared for enabling';
  -- EXACTLY one blocker. The SQL gate and its TypeScript mirror must agree on
  -- the reason, not merely on the refusal — see the note in rag_should_enable.
  assert g.blockers = array['not_measured'],
    format('I. blockers should be exactly {not_measured}, got %s', g.blockers);
  raise notice 'I.    empty ledger .............. REFUSED blockers=%', g.blockers;
end $$;

-- ── II. a score without measurement is rejected BY THE DATABASE ──────────
do $$ declare rejected boolean := false; begin
  begin
    insert into public.rag_eval_runs
      (org_id, anchors_available, measured_questions, hit_at_5, citation_accuracy, corpus_verified)
    values ('00000000-0000-0000-0000-00000000aaaa', 21, 0, 0.99, 0.99, true);
  exception when check_violation then rejected := true;
  end;
  assert rejected, 'II. a run claimed scores with measured_questions = 0';
  raise notice 'II.   score without measurement .. REJECTED (check constraint)';
end $$;

-- ── III. below the 30-question floor → blocked, however good the scores ──
do $$ declare g record; begin
  insert into public.rag_eval_runs
    (org_id, anchors_available, measured_questions, hit_at_5, citation_accuracy, corpus_verified, run_at)
  values ('00000000-0000-0000-0000-00000000aaaa', 21, 21, 1.00, 1.00, true, now() - interval '3 min');
  select * into g from public.rag_should_enable();
  assert g.enable = false, 'III. 21 measured questions cleared the 30 floor';
  assert 'measured_questions_below_30' = any(g.blockers),
    format('III. wrong blocker: %s', g.blockers);
  raise notice 'III.  21 of 30 measured ......... REFUSED blockers=% (perfect scores ignored)', g.blockers;
end $$;

-- ── IV. the only configuration that clears the gate ──────────────────────
do $$ declare g record; begin
  insert into public.rag_eval_runs
    (org_id, anchors_available, measured_questions, hit_at_5, citation_accuracy, corpus_verified, run_at)
  values ('00000000-0000-0000-0000-00000000aaaa', 34, 32, 0.88, 0.96, true, now() - interval '2 min');
  select * into g from public.rag_should_enable();
  assert g.enable = true, format('IV. a qualifying run was still blocked: %s', g.blockers);
  raise notice 'IV.   32 measured, both thresholds ENABLED (blockers=%)', coalesce(g.blockers::text,'{}');
end $$;

-- ── V. an UNVERIFIED corpus is refused even at perfect scores ────────────
do $$ declare g record; begin
  insert into public.rag_eval_runs
    (org_id, anchors_available, measured_questions, hit_at_5, citation_accuracy, corpus_verified, run_at)
  values ('00000000-0000-0000-0000-00000000aaaa', 40, 40, 1.00, 1.00, false, now() - interval '1 min');
  select * into g from public.rag_should_enable();
  assert g.enable = false, 'V. an unverified corpus cleared the gate on perfect scores';
  assert 'corpus_not_verified' = any(g.blockers), format('V. wrong blocker: %s', g.blockers);
  raise notice 'V.    perfect on UNVERIFIED corpus REFUSED blockers=%', g.blockers;
end $$;

-- ── VI. never measured ⇒ NULL, never a zero that reads like a score ──────
do $$ declare h record; begin
  select * into h from public.rag_health(7);
  assert h.retrievals = 0, format('VI. expected 0 retrievals, got %s', h.retrievals);
  assert h.retrieval_p50_ms is null, 'VI. latency reported a number with no retrievals';
  assert h.insufficient_rate is null, 'VI. insufficient-evidence rate was zero-filled';
  assert h.gap_coverage is null, 'VI. gap coverage was zero-filled with no gaps';
  raise notice 'VI.   unmeasured fields ......... NULL (p50=% rate=% coverage=%)',
    coalesce(h.retrieval_p50_ms::text,'NULL'), coalesce(h.insufficient_rate::text,'NULL'),
    coalesce(h.gap_coverage::text,'NULL');
end $$;

-- ── VII. staleness: classification, then reaction to a real content edit ─
do $$ declare q record; n int; begin
  insert into public.rag_chunks (id,org_id,document_id,chunk_index,content,embedding,embedded_hash)
  values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000aaaa',
          '00000000-0000-0000-0000-0000000000d1',0,'نص أول',null,null),
         ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000aaaa',
          '00000000-0000-0000-0000-0000000000d1',1,'نص ثانٍ','[0.1]',
          encode(extensions.digest('نص ثانٍ','sha256'),'hex'));

  select count(*) into n from public.rag_reembed_queue;
  assert n = 1, format('VII. expected exactly the unembedded chunk queued, got %s', n);
  select * into q from public.rag_reembed_queue;
  assert q.reason = 'never_embedded', format('VII. wrong reason: %s', q.reason);

  -- Now EDIT the content of the up-to-date chunk. content_hash is generated,
  -- so it moves; embedded_hash does not. The vector is now behind its text.
  update public.rag_chunks set content = 'نص ثانٍ بعد التعديل'
   where id='00000000-0000-0000-0000-0000000000c2';
  select count(*) into n from public.rag_reembed_queue;
  assert n = 2, format('VII. the edited chunk did not become stale (queue=%s)', n);
  select * into q from public.rag_reembed_queue where id='00000000-0000-0000-0000-0000000000c2';
  assert q.reason = 'content_changed', format('VII. wrong reason after edit: %s', q.reason);
  raise notice 'VII.  re-embed queue ............ never_embedded=1 → after edit content_changed (queue=%)', n;
end $$;

-- ── VIII. a member cannot hand-write a passing eval row ──────────────────
-- Without this, the auto-enable gate is decorative: anyone could insert
-- 1.00 / 1.00 / verified and flip the flag.
do $$ declare denied boolean := false; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0001"}',true);
  execute 'set local role authenticated';
  begin
    insert into public.rag_eval_runs
      (org_id, anchors_available, measured_questions, hit_at_5, citation_accuracy, corpus_verified)
    values ('00000000-0000-0000-0000-00000000aaaa', 99, 99, 1.00, 1.00, true);
  exception when insufficient_privilege then denied := true;
  end;
  execute 'reset role';
  assert denied, 'VIII. a member INSERTED a passing evaluation — the gate is bypassable';
  raise notice 'VIII. member writes eval row .... DENIED (privilege revoked)';
end $$;

-- ── IX. health is readable by a member, and org-scoped ──────────────────-
do $$ declare h record; begin
  insert into public.rag_retrieval_log (org_id,query,latency_ms,results_count,insufficient_evidence)
  values ('00000000-0000-0000-0000-00000000aaaa','سؤال أ',120,5,false),
         ('00000000-0000-0000-0000-00000000aaaa','سؤال ب',240,0,true),
         ('00000000-0000-0000-0000-00000000bbbb','سؤال مؤسسة ب',999,0,true);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0001"}',true);
  execute 'set local role authenticated';
  select * into h from public.rag_health(7);
  execute 'reset role';
  assert h.retrievals = 2,
    format('IX. member saw %s retrievals — org B leaked into health', h.retrievals);
  assert h.insufficient_rate = 0.5000,
    format('IX. insufficient rate %s, expected 0.5', h.insufficient_rate);
  assert h.retrieval_p50_ms = 180, format('IX. p50 %s, expected 180', h.retrieval_p50_ms);
  raise notice 'IX.   health as member .......... retrievals=% p50=%ms rate=% (org B excluded)',
    h.retrievals, h.retrieval_p50_ms, h.insufficient_rate;
end $$;

-- ── X. candidate counters inside health do not cross the tenant line ─────
-- rag_health() sums rag_candidate_stats. That view is SECURITY DEFINER over a
-- table whose SELECT privilege is revoked, so owner rights bypass RLS and its
-- internal is_org_member predicate is the ONLY isolation left. Seed BOTH orgs
-- and read as a member of one: without the predicate this leaks, and an
-- assertion over an org with no rows would have proved nothing.
do $$ declare h record; leaked int; begin
  insert into public.rag_candidates (org_id,question,answer,verified,content_sha256) values
    ('00000000-0000-0000-0000-00000000aaaa','سؤال أ','نص أ',false,repeat('a',64)),
    ('00000000-0000-0000-0000-00000000bbbb','سؤال ب','نص ب',false,repeat('b',64)),
    ('00000000-0000-0000-0000-00000000bbbb','سؤال ب٢','نص ب٢',false,repeat('c',64));

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0001"}',true);
  execute 'set local role authenticated';
  select count(*) into leaked from public.rag_candidate_stats
   where org_id = '00000000-0000-0000-0000-00000000bbbb';
  select * into h from public.rag_health(7);
  execute 'reset role';

  assert leaked = 0, 'X. another org''s candidate counters were visible to a member';
  assert h.candidates_total = 1,
    format('X. health counted %s candidates — org B leaked into the total', h.candidates_total);
  raise notice 'X.    candidate counters ........ own=% other-org rows=% (isolation held)',
    h.candidates_total, leaked;
end $$;

do $$ begin raise notice '──── CONTINUOUS-OPERATION CHECKS PASSED (I–X) ────'; end $$;
rollback;
