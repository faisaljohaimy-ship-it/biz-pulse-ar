-- ============================================================================
-- RAG LAYER (6) — learning loop: candidates · feedback · gaps
-- STAGED, NOT APPLIED (no DB reachability from the build environment).
--
-- THE POISONING BARRIER IS THE POINT OF THIS FILE.
--
-- A compliance system that feeds its own model output back into its knowledge
-- base degrades across generations (model collapse). So promotion to
-- verified = true is a ONE-WAY gate enforced in the DATABASE, not in app code
-- a client could bypass. A candidate may be promoted ONLY if:
--
--   ① it is GROUNDED: citation_chunk_id points at a real row in rag_chunks
--      that belongs to THE SAME org (a citation into another tenant's corpus
--      is both ungrounded and an isolation breach — refused on both counts),
--   ② or an ADMIN of that org explicitly approves it
--      (is_org_member(org_id,'admin')).
--
-- Anything else — i.e. any model-generated text with no traceable source —
-- stays verified = false. It is still stored, counted, analysed and reported;
-- it simply never enters a retrieval result and is never cited. That is not a
-- queue waiting to drain: it is a permanent one-way barrier.
--
-- Idempotent; adds only. No existing row is touched.
-- ============================================================================

set local search_path = public, extensions;

-- ── Candidates ────────────────────────────────────────────────────────────

create table if not exists public.rag_candidates (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default public.current_org_id()
                      references public.organizations(id) on delete cascade,
  question          text not null,
  answer            text not null,
  -- Provenance of the answer text. 'model_generated' is the UNTRUSTED class.
  source_kind       text not null default 'model_generated'
                      check (source_kind in ('model_generated', 'uploaded_chunk', 'admin_authored')),
  -- ① grounding: must resolve to a real chunk in the SAME org to count.
  citation_chunk_id uuid references public.rag_chunks(id) on delete set null,
  -- The gate's output. NEVER set directly by a client — see the trigger.
  verified          boolean not null default false,
  verified_by       uuid,
  verified_at       timestamptz,
  verified_reason   text check (verified_reason in ('grounded_citation', 'admin_approved')),
  content_sha256    text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at        timestamptz not null default now(),
  -- Idempotent capture: the same answer for the same question is one row.
  unique (org_id, content_sha256)
);

create index if not exists rag_candidates_org_idx      on public.rag_candidates (org_id);
create index if not exists rag_candidates_verified_idx on public.rag_candidates (org_id, verified);
create index if not exists rag_candidates_created_idx  on public.rag_candidates (org_id, created_at desc);

-- ── The gate ──────────────────────────────────────────────────────────────
-- Runs on INSERT and UPDATE. If the row claims verified = true, it must EARN
-- it here; otherwise the claim is stripped (not raised) so ordinary capture
-- never fails — the barrier degrades to "stored but unverified", by design.

create or replace function public.rag_enforce_verification_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  grounded boolean := false;
  is_admin boolean := false;
BEGIN
  IF NEW.verified IS NOT TRUE THEN
    -- Unverified rows are always accepted; clear any stale attribution.
    NEW.verified        := false;
    NEW.verified_by     := NULL;
    NEW.verified_at     := NULL;
    NEW.verified_reason := NULL;
    RETURN NEW;
  END IF;

  -- ① Grounded: the citation must resolve to a live chunk in the SAME org.
  IF NEW.citation_chunk_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.rag_chunks c
      WHERE c.id = NEW.citation_chunk_id
        AND c.org_id = NEW.org_id
    ) INTO grounded;
  END IF;

  -- ② Admin of THIS org explicitly approving.
  SELECT public.is_org_member(NEW.org_id, 'admin') INTO is_admin;

  IF grounded THEN
    NEW.verified        := true;
    NEW.verified_reason := 'grounded_citation';
    NEW.verified_at     := now();
    NEW.verified_by     := auth.uid();
  ELSIF is_admin THEN
    NEW.verified        := true;
    NEW.verified_reason := 'admin_approved';
    NEW.verified_at     := now();
    NEW.verified_by     := auth.uid();
  ELSE
    -- Neither condition met → the promotion is REFUSED, silently and
    -- permanently. The row still lands; it just never becomes citable.
    NEW.verified        := false;
    NEW.verified_by     := NULL;
    NEW.verified_at     := NULL;
    NEW.verified_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

drop trigger if exists rag_candidates_gate on public.rag_candidates;
create trigger rag_candidates_gate
  before insert or update on public.rag_candidates
  for each row execute function public.rag_enforce_verification_gate();

alter table public.rag_candidates enable row level security;

drop policy if exists rag_candidates_member_read on public.rag_candidates;
create policy rag_candidates_member_read on public.rag_candidates
  for select to authenticated
  using (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_candidates_member_write on public.rag_candidates;
create policy rag_candidates_member_write on public.rag_candidates
  for insert to authenticated
  with check (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_candidates_admin_manage on public.rag_candidates;
create policy rag_candidates_admin_manage on public.rag_candidates
  for update to authenticated
  using (public.is_org_member(org_id, 'admin'))
  with check (public.is_org_member(org_id, 'admin'));

grant select, insert on public.rag_candidates to authenticated;
grant update              on public.rag_candidates to authenticated;
grant all                 on public.rag_candidates to service_role;

-- The ONLY surface retrieval may ever read. Verified rows, nothing else.
create or replace view public.rag_verified_candidates
with (security_invoker = true) as
  select id, org_id, question, answer, citation_chunk_id, verified_reason, created_at
  from public.rag_candidates
  where verified = true;

grant select on public.rag_verified_candidates to authenticated, service_role;

comment on view public.rag_verified_candidates is
  'The one-way barrier''s clean side: only candidates that earned verification (grounded citation or admin approval). Unverified model output is never exposed here.';

-- ── Gaps (generated from every insufficient_evidence outcome) ─────────────

create table if not exists public.rag_gaps (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default public.current_org_id()
                  references public.organizations(id) on delete cascade,
  query         text not null,
  query_norm    text generated always as (public.nx_ar_normalize(query)) stored,
  hit_count     int  not null default 1 check (hit_count > 0),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  -- One row per distinct normalised question per org; repeats increment.
  unique (org_id, query_norm)
);

create index if not exists rag_gaps_org_open_idx on public.rag_gaps (org_id, resolved_at, hit_count desc);

alter table public.rag_gaps enable row level security;

drop policy if exists rag_gaps_member_read on public.rag_gaps;
create policy rag_gaps_member_read on public.rag_gaps
  for select to authenticated using (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_gaps_member_write on public.rag_gaps;
create policy rag_gaps_member_write on public.rag_gaps
  for insert to authenticated with check (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_gaps_admin_manage on public.rag_gaps;
create policy rag_gaps_admin_manage on public.rag_gaps
  for update to authenticated
  using (public.is_org_member(org_id, 'admin'))
  with check (public.is_org_member(org_id, 'admin'));

grant select, insert, update on public.rag_gaps to authenticated;
grant all on public.rag_gaps to service_role;

-- Record (or bump) a gap. SECURITY INVOKER: the caller's RLS decides the org.
create or replace function public.rag_record_gap(_query text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
DECLARE
  gap_id uuid;
BEGIN
  INSERT INTO public.rag_gaps (query)
  VALUES (_query)
  ON CONFLICT (org_id, query_norm) DO UPDATE
    SET hit_count = public.rag_gaps.hit_count + 1,
        last_seen_at = now(),
        resolved_at = NULL
  RETURNING id INTO gap_id;
  RETURN gap_id;
END;
$$;

revoke all on function public.rag_record_gap(text) from public, anon;
grant execute on function public.rag_record_gap(text) to authenticated, service_role;

-- ── Feedback (drives RRF weight / chunk-size tuning — never model weights) ─

create table if not exists public.rag_feedback (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default public.current_org_id()
                 references public.organizations(id) on delete cascade,
  query        text not null,
  chunk_id     uuid references public.rag_chunks(id) on delete cascade,
  rank         int  check (rank is null or rank > 0),
  -- Which retrieval paths produced this result (1..3) — the tuning signal.
  matched_paths int check (matched_paths is null or matched_paths between 1 and 3),
  helpful      boolean not null,
  created_at   timestamptz not null default now()
);

create index if not exists rag_feedback_org_idx on public.rag_feedback (org_id, created_at desc);

alter table public.rag_feedback enable row level security;

drop policy if exists rag_feedback_member_read on public.rag_feedback;
create policy rag_feedback_member_read on public.rag_feedback
  for select to authenticated using (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_feedback_member_write on public.rag_feedback;
create policy rag_feedback_member_write on public.rag_feedback
  for insert to authenticated with check (public.is_org_member(org_id, 'viewer'));

grant select, insert on public.rag_feedback to authenticated;
grant all on public.rag_feedback to service_role;

comment on table public.rag_feedback is
  'Retrieval feedback. Tunes RRF weights and chunk size ONLY — it never retrains or alters any model.';
