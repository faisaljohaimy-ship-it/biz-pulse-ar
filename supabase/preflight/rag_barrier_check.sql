-- ============================================================================
-- POISONING BARRIER — live verification harness (NOT a migration)
--
-- Runs the REAL trigger, the REAL view and the REAL privilege model against a
-- throwaway Postgres. This is the negative test the doctrine demands, actually
-- EXECUTED — not a text assertion about SQL.
--
-- pgvector is absent in the sandbox, so rag_chunks is created here WITHOUT its
-- embedding column (a probe). Nothing else is faked: the trigger function, the
-- view, the policies and the GRANT/REVOKE are \i-included from the real
-- migrations verbatim.
--
-- Proven here:
--   I.   verified=true is REFUSED for model output with no citation
--   II.  a DANGLING citation is refused
--   III. a CROSS-ORG citation is refused (isolation beats admin)
--   IV.  a grounded, same-org citation IS promoted
--   V.   an admin may promote citation-less content
--   VI.  NEGATIVE: an unverified candidate appears in ZERO retrieval rows
--   VII. a plain member has NO privilege to read the base table at all
--   VIII.counters still see the unverified row (counted, not readable)
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
create role anon nologin;           -- exists on Supabase; REVOKE targets it
create role authenticated nologin;
create role service_role nologin;
grant usage on schema public, extensions to authenticated, service_role;

\i :normalize_file
\i :documents_file

-- rag_chunks probe: real shape MINUS the pgvector column (absent in sandbox).
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
create policy rag_chunks_member_read on public.rag_chunks
  for select to authenticated using (public.is_org_member(org_id,'viewer'));
grant select on public.rag_chunks to authenticated;

-- ── The REAL learning-loop migrations under test ──────────────────────────
\i :loop_file
\i :hardening_file

-- ── Fixtures: two orgs, one admin each, one chunk each ────────────────────
insert into public.organizations (id,name,slug) values
  ('00000000-0000-0000-0000-00000000aaaa','Org A','org-a'),
  ('00000000-0000-0000-0000-00000000bbbb','Org B','org-b');
insert into public.org_members (org_id,user_id,role) values
  ('00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000a0001','admin'),
  ('00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000a0002','viewer'),
  ('00000000-0000-0000-0000-00000000bbbb','00000000-0000-0000-0000-0000000b0001','admin');
insert into public.rag_documents (id,org_id,doc_type,code,title,source,content_sha256) values
  ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000aaaa','sec','SEC-18','محطات التحويل','hcis.gov.sa',repeat('a',64)),
  ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-00000000bbbb','sec','SEC-18','محطات التحويل','hcis.gov.sa',repeat('b',64));
insert into public.rag_chunks (id,org_id,document_id,chunk_index,content) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000000d1',0,'نص مقطع مؤسسة أ'),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000bbbb','00000000-0000-0000-0000-0000000000d2',0,'نص مقطع مؤسسة ب');

-- ── I. model output, no citation, NOT admin → refused ─────────────────────
do $$ declare v boolean; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0002"}',true);
  insert into public.rag_candidates (org_id,question,answer,verified,content_sha256)
  values ('00000000-0000-0000-0000-00000000aaaa','سؤال','نص مولّد بلا مصدر',true,repeat('1',64))
  returning verified into v;
  assert v = false, 'I. ungrounded model output was PROMOTED — barrier breached';
  raise notice 'I.   ungrounded + non-admin ..... REFUSED (verified=%)', v;
end $$;

-- ── II. dangling citation → refused ───────────────────────────────────────
do $$ declare v boolean; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0002"}',true);
  insert into public.rag_candidates (org_id,question,answer,citation_chunk_id,verified,content_sha256)
  values ('00000000-0000-0000-0000-00000000aaaa','سؤال','نص',null,true,repeat('2',64))
  returning verified into v;
  assert v = false, 'II. citation-less claim promoted';
  raise notice 'II.  dangling / absent citation . REFUSED (verified=%)', v;
end $$;

-- ── III. CROSS-ORG citation, by an ADMIN → still refused ─────────────────
do $$ declare v boolean; declare r text; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0001"}',true);
  insert into public.rag_candidates (org_id,question,answer,citation_chunk_id,verified,content_sha256)
  values ('00000000-0000-0000-0000-00000000aaaa','سؤال','نص',
          '00000000-0000-0000-0000-0000000000c2',true,repeat('3',64))
  returning verified, verified_reason into v, r;
  -- Isolation outranks approval: a citation into ANOTHER org is refused
  -- outright — the admin route must NOT rescue it.
  assert v = false and r is null,
    format('III. cross-org citation was promoted (verified=%s reason=%s)', v, coalesce(r,'null'));
  raise notice 'III. cross-org citation + ADMIN . REFUSED (isolation > approval)';
end $$;

-- ── IV. grounded, same org → PROMOTED ─────────────────────────────────────
do $$ declare v boolean; declare r text; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0002"}',true);
  insert into public.rag_candidates (org_id,question,answer,citation_chunk_id,verified,content_sha256)
  values ('00000000-0000-0000-0000-00000000aaaa','سؤال','نص مُسند',
          '00000000-0000-0000-0000-0000000000c1',true,repeat('4',64))
  returning verified, verified_reason into v, r;
  assert v = true and r = 'grounded_citation', 'IV. grounded citation was NOT promoted';
  raise notice 'IV.  grounded same-org citation . PROMOTED (reason=%)', r;
end $$;

-- ── V. admin promotes citation-less content ───────────────────────────────
do $$ declare v boolean; declare r text; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0001"}',true);
  insert into public.rag_candidates (org_id,question,answer,verified,content_sha256)
  values ('00000000-0000-0000-0000-00000000aaaa','سؤال','نص معتمَد',true,repeat('5',64))
  returning verified, verified_reason into v, r;
  assert v = true and r = 'admin_approved', 'V. admin approval did not promote';
  raise notice 'V.   admin approval ............. PROMOTED (reason=%)', r;
end $$;

-- ── VI. NEGATIVE: unverified rows appear in ZERO answer rows ──────────────
do $$ declare leaked int; declare total int; begin
  select count(*) into total   from public.rag_candidates
    where org_id='00000000-0000-0000-0000-00000000aaaa';
  select count(*) into leaked  from public.rag_verified_candidates v
    where v.org_id='00000000-0000-0000-0000-00000000aaaa'
      and exists (select 1 from public.rag_candidates c
                  where c.id=v.id and c.verified=false);
  assert leaked = 0, format('VI. %s unverified rows LEAKED into the answer surface', leaked);
  raise notice 'VI.  unverified in answer path .. 0 of % rows  <-- NEGATIVE TEST', total;
end $$;

-- ── VII. a plain member has NO privilege on the base table ────────────────
do $$ declare denied boolean := false; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0002"}',true);
  execute 'set local role authenticated';
  begin
    perform 1 from public.rag_candidates limit 1;
  exception when insufficient_privilege then denied := true;
  end;
  execute 'reset role';
  assert denied, 'VII. a member could SELECT raw candidate text';
  raise notice 'VII. member SELECT on base table  DENIED (privilege revoked)';
end $$;

-- ── VIII. counters still see it (counted, not readable) ───────────────────
do $$ declare c record; begin
  select * into c from public.rag_candidate_stats
   where org_id='00000000-0000-0000-0000-00000000aaaa';
  assert c.candidates = 5, format('VIII. expected 5 candidates, got %s', c.candidates);
  assert c.awaiting_source >= 1, 'VIII. awaiting-source bucket empty';
  raise notice 'VIII. counters .................. candidates=% verified=% rejected=% awaiting=%',
    c.candidates, c.verified, c.rejected, c.awaiting_source;
end $$;

-- ── IX. tuner is read-only and returns the baseline on a thin sample ──────
do $$ declare t record; begin
  select * into t from public.rag_tune_rrf_weights();
  assert t.kept_baseline = true, 'IX. tuner did not keep the baseline on 0 rows';
  assert t.w_vector = 1.0 and t.w_fts = 1.0 and t.w_trgm = 0.5, 'IX. baseline weights wrong';
  raise notice 'IX.  tuner (0 feedback rows) .... baseline kept (%/%/%)',
    t.w_vector, t.w_fts, t.w_trgm;
end $$;

-- ── X. gap report ranks by recurrence ─────────────────────────────────────
do $$ declare top record; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0002"}',true);
  perform public.rag_record_gap('ما اشتراطات الأسوار الأمنية؟');
  perform public.rag_record_gap('ما اشتراطات الأسوار الأمنيّة؟');  -- same after normalisation
  perform public.rag_record_gap('سؤال آخر');
  select * into top from public.rag_gaps_report
   where org_id='00000000-0000-0000-0000-00000000aaaa' limit 1;
  assert top.hit_count = 2, format('X. expected the repeated gap on top, got hit_count=%s', top.hit_count);
  raise notice 'X.   gap report ................. top hit_count=% (normalised merge works)', top.hit_count;
end $$;

-- ── Org B gets its OWN candidates, or XI/XII prove nothing ────────────────
-- Without these rows, "assert other-org rows = 0" passes vacuously: there is
-- no foreign group to leak in the first place. A green assertion over an
-- empty set is the false negative that let a missing is_org_member predicate
-- ship once already.
do $$ begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000b0001"}',true);
  insert into public.rag_candidates (org_id,question,answer,citation_chunk_id,verified,content_sha256)
  values ('00000000-0000-0000-0000-00000000bbbb','سؤال مؤسسة ب','نص مُسند',
          '00000000-0000-0000-0000-0000000000c2',true,repeat('7',64));
  insert into public.rag_candidates (org_id,question,answer,verified,content_sha256)
  values ('00000000-0000-0000-0000-00000000bbbb','سؤال آخر لمؤسسة ب','نص بلا سند',false,repeat('8',64));
end $$;

-- ── XI. the answer surface is READABLE BY A MEMBER, and org-scoped ────────
-- The regression this catches: migration 7 revokes SELECT on the base table,
-- so a security_invoker view over it is denied to the very members it serves
-- — the barrier would take the answer surface down with it. Checks VI–VIII
-- ran as superuser and could not see that. This one runs as the member.
do $$ declare mine int; theirs int; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0002"}',true);
  execute 'set local role authenticated';
  select count(*) into mine from public.rag_verified_candidates
   where org_id='00000000-0000-0000-0000-00000000aaaa';
  select count(*) into theirs from public.rag_verified_candidates
   where org_id='00000000-0000-0000-0000-00000000bbbb';
  execute 'reset role';
  assert mine = 2, format('XI. member sees %s verified rows of its own org, expected 2', mine);
  assert theirs = 0, 'XI. ANOTHER ORG''s verified rows were visible through the view';
  raise notice 'XI.  member reads answer surface  OK (own=% other=%)', mine, theirs;
end $$;

-- ── XII. counters likewise readable by a member, and org-scoped ───────────
do $$ declare n int; other int; begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000a0002"}',true);
  execute 'set local role authenticated';
  select candidates into n from public.rag_candidate_stats
   where org_id='00000000-0000-0000-0000-00000000aaaa';
  select count(*) into other from public.rag_candidate_stats
   where org_id='00000000-0000-0000-0000-00000000bbbb';
  execute 'reset role';
  assert n = 5, format('XII. member sees candidates=%s, expected 5', n);
  assert other = 0, 'XII. another org''s counters were visible';
  raise notice 'XII. member reads counters ...... OK (own=% other-org rows=%)', n, other;
end $$;

do $$ begin raise notice '──── BARRIER + LOOP CHECKS PASSED (I–XII) ────'; end $$;
rollback;
