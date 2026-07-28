-- ============================================================================
-- RAG LAYER (8) — closing phase ④: READ-SIDE CAPTURE
-- STAGED, NOT APPLIED.
--
-- THE CONSTITUTIONAL SHAPE OF THIS FILE
--
-- Capture happens on the READ SIDE ONLY: a scheduled job reads the existing
-- conversation tables after the fact. It is not a hook, not a wrapper, not a
-- trigger on the answer path. Consequences, stated as guarantees:
--
--   • ZERO modification to the FINN / Gemini path. Nothing in that path calls
--     anything defined here. If this whole file were dropped, FINN behaves
--     identically.
--   • Capture can NEVER run inside a user request. That is enforced by
--     PRIVILEGE, not by comment: EXECUTE is revoked from anon and
--     authenticated and granted to service_role alone. A browser session
--     physically cannot invoke it.
--   • Capture latency is therefore never user-visible: a slow or failing
--     capture job degrades the gap backlog, never an answer.
--
-- WHAT IT WRITES, AND WHAT IT REFUSES TO WRITE
--
-- It writes to public.rag_gaps only — the ingestion backlog. It does NOT
-- write to rag_chunks, rag_documents or rag_candidates. That refusal is the
-- poisoning barrier held from a second angle: an automated job that reads
-- model conversations must never be able to deposit their content into the
-- corpus, however indirectly. Migration 6 makes promotion earn-only;
-- this file makes the automated reader unable to even attempt it.
--
-- A DESIGN REFUSAL, RECORDED
--
-- aria_conversations.title is available and tempting: it would multiply the
-- gap backlog overnight. It is deliberately NOT minted into rag_gaps. A
-- conversation title is evidence that a question was ASKED, not evidence
-- that it went UNANSWERED — and rag_gaps is the unanswered-question backlog.
-- Feeding demand into a failure ledger would inflate every coverage number
-- computed downstream. Conversations are therefore read for demand counting
-- and scan bounds only; the gap rows come from aria_learning_log, which
-- records failures by construction.
--
-- Idempotent; adds only. No existing table is altered.
-- ============================================================================

set local search_path = public, extensions;

-- ── Watermark ─────────────────────────────────────────────────────────────
-- Incremental by construction: each run resumes from where the last stopped,
-- so re-running the job is cheap and cannot double-count. The counters are
-- the job's own audit trail.

create table if not exists public.rag_capture_state (
  source            text primary key
                      check (source in ('aria_learning_log', 'aria_conversations')),
  -- Exclusive lower bound for the next scan. Paired with last_seen_id to form
  -- a KEYSET cursor: a bare timestamp cursor silently drops every row that
  -- shares max(created_at) with the last row of a full batch, because the
  -- next scan's `created_at > mark` excludes them. Timestamps collide freely
  -- (bulk inserts land on the same microsecond); (created_at, id) does not.
  last_seen_at      timestamptz not null default '-infinity'::timestamptz,
  last_seen_id      uuid,
  last_run_at       timestamptz,
  rows_scanned      bigint not null default 0,
  gaps_recorded     bigint not null default 0,
  skipped_no_org    bigint not null default 0,
  updated_at        timestamptz not null default now()
);

insert into public.rag_capture_state (source) values
  ('aria_learning_log'), ('aria_conversations')
on conflict (source) do nothing;

alter table public.rag_capture_state enable row level security;

-- ANY member may READ the job's audit trail; nobody but the job may write it.
-- The table holds no org_id and no tenant content — two source names and their
-- counters — so `using (true)` leaks nothing. The policy is named for what it
-- actually grants: member read, not admin read.
drop policy if exists rag_capture_state_admin_read on public.rag_capture_state;
drop policy if exists rag_capture_state_member_read on public.rag_capture_state;
create policy rag_capture_state_member_read on public.rag_capture_state
  for select to authenticated using (true);

revoke insert, update, delete on public.rag_capture_state from authenticated, anon;
grant  select on public.rag_capture_state to authenticated;
grant  all    on public.rag_capture_state to service_role;

comment on table public.rag_capture_state is
  'Watermark + audit trail for the read-side capture job. Readable by operators, writable only by the job.';

-- ── Org resolution: fail closed ───────────────────────────────────────────
-- The conversation tables key on user_id; rag_gaps keys on org_id. A cron has
-- no session, so current_org_id() is unavailable and the mapping must be
-- explicit. It mirrors current_org_id()'s own rule: resolve ONLY when the
-- membership is unambiguous. A user in two orgs yields NULL and the row is
-- skipped — recording a question under a guessed tenant is an isolation
-- defect, and isolation outranks capture completeness.

create or replace function public.rag_resolve_capture_org(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  -- HAVING with no GROUP BY: the aggregate spans the whole membership set, so
  -- the row is emitted ONLY when it is unambiguous. Zero or two memberships
  -- yield no row at all, and a scalar SQL function with no row returns NULL —
  -- failing closed without a CASE branch that could be mis-edited later.
  select (array_agg(org_id))[1]
  from public.org_members
  where user_id = _user_id
  having count(*) = 1;
$$;

revoke all on function public.rag_resolve_capture_org(uuid) from public, anon, authenticated;
grant execute on function public.rag_resolve_capture_org(uuid) to service_role;

-- ── The capture job ───────────────────────────────────────────────────────

create or replace function public.rag_capture_readside(_limit int default 500)
returns table (
  source          text,
  rows_scanned    int,
  gaps_recorded   int,
  skipped_no_org  int,
  watermark       timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  log_mark   timestamptz;
  log_mark_id uuid;
  conv_mark  timestamptz;
  new_log_id uuid;
  n_scanned  int := 0;
  n_recorded int := 0;
  n_skipped  int := 0;
  n_conv     int := 0;
  new_log    timestamptz;
  new_conv   timestamptz;
  batch_size int := least(greatest(coalesce(_limit, 500), 1), 5000);
BEGIN
  -- Every column reference is alias-qualified: `source`, `rows_scanned` and
  -- friends are also OUT parameters of this function, and an unqualified name
  -- is an ambiguity error, not a silent wrong answer.
  SELECT s.last_seen_at, s.last_seen_id INTO log_mark, log_mark_id
    FROM public.rag_capture_state s WHERE s.source = 'aria_learning_log';
  SELECT s.last_seen_at INTO conv_mark
    FROM public.rag_capture_state s WHERE s.source = 'aria_conversations';
  log_mark  := coalesce(log_mark,  '-infinity'::timestamptz);
  conv_mark := coalesce(conv_mark, '-infinity'::timestamptz);

  -- ① FAILURES → gaps. aria_learning_log rows exist because an answer fell
  --    short; every unresolved row is a genuine unanswered question.
  --
  -- Scan, count and upsert in ONE statement. Deliberately not a temp table:
  -- a CREATE TEMP TABLE ... ON COMMIT DROP survives until COMMIT, so a second
  -- call inside the same transaction would abort on "relation already exists".
  -- Production cron gives each call its own transaction and would never have
  -- hit it — but a batch driver looping twice would, and so does the test
  -- harness. One statement has no such state to leak.
  WITH scan AS (
    SELECT
      l.created_at,
      l.id,
      btrim(l.question)                         AS question,
      public.rag_resolve_capture_org(l.user_id)  AS org_id
    FROM public.aria_learning_log l
    -- Keyset, not a bare timestamp: row comparison against (mark, mark_id)
    -- makes the cursor total, so a batch that ends mid-tie resumes exactly
    -- where it stopped instead of stepping over the rest of the tie.
    WHERE (l.created_at, l.id) > (log_mark, coalesce(log_mark_id, '00000000-0000-0000-0000-000000000000'::uuid))
      AND l.resolved IS NOT TRUE
      AND btrim(coalesce(l.question, '')) <> ''
    ORDER BY l.created_at, l.id
    LIMIT batch_size
  ), stats AS (
    SELECT count(*)::int                                  AS scanned,
           count(*) FILTER (WHERE org_id IS NULL)::int     AS skipped,
           max(created_at)                                 AS mark,
           -- The id of the LAST row in (created_at, id) order — the cursor.
           (SELECT s2.id FROM scan s2 ORDER BY s2.created_at DESC, s2.id DESC LIMIT 1) AS mark_id
    FROM scan
  ), deduped AS (
    -- Dedupe INSIDE the batch before upserting: two questions in one batch can
    -- normalise to the same key, and ON CONFLICT DO UPDATE cannot touch the
    -- same row twice in one statement. Collapsing them here also makes the
    -- hit_count increment reflect real repetition rather than batch shape.
    SELECT org_id, min(question) AS question, count(*)::int AS repeats
    FROM scan
    WHERE org_id IS NOT NULL
    GROUP BY org_id, public.nx_ar_normalize(question)
  ), upserted AS (
    INSERT INTO public.rag_gaps (org_id, query, hit_count)
    SELECT org_id, question, repeats FROM deduped
    ON CONFLICT (org_id, query_norm) DO UPDATE
      SET hit_count    = public.rag_gaps.hit_count + excluded.hit_count,
          last_seen_at = now(),
          resolved_at  = NULL
    RETURNING 1
  )
  SELECT stats.scanned, stats.skipped, stats.mark, stats.mark_id,
         (SELECT count(*)::int FROM upserted)
    INTO n_scanned, n_skipped, new_log, new_log_id, n_recorded
  FROM stats;

  UPDATE public.rag_capture_state s
     SET last_seen_at   = coalesce(new_log, s.last_seen_at),
         last_seen_id   = coalesce(new_log_id, s.last_seen_id),
         last_run_at    = now(),
         rows_scanned   = s.rows_scanned  + n_scanned,
         gaps_recorded  = s.gaps_recorded + n_recorded,
         skipped_no_org = s.skipped_no_org + n_skipped,
         updated_at     = now()
   WHERE s.source = 'aria_learning_log';

  -- ② DEMAND → counted, never minted. See the design refusal in the header:
  --    conversations are scanned to advance the watermark and record how much
  --    real traffic the window covered, and produce ZERO gap rows.
  SELECT count(*)::int, max(c.last_message_at)
    INTO n_conv, new_conv
  FROM public.aria_conversations c
  WHERE c.last_message_at > conv_mark
    AND c.is_simulation IS NOT TRUE;

  UPDATE public.rag_capture_state s
     SET last_seen_at  = coalesce(new_conv, s.last_seen_at),
         last_run_at   = now(),
         rows_scanned  = s.rows_scanned + n_conv,
         updated_at    = now()
   WHERE s.source = 'aria_conversations';

  RETURN QUERY
    SELECT 'aria_learning_log'::text, n_scanned, n_recorded, n_skipped,
           coalesce(new_log, log_mark)
    UNION ALL
    SELECT 'aria_conversations'::text, n_conv, 0, 0,
           coalesce(new_conv, conv_mark);
END;
$$;

-- THE ENFORCEMENT. Not a convention — a privilege boundary. A browser session
-- (anon or authenticated) cannot execute this, so no user request path can
-- ever reach capture, whatever future code is written against it.
revoke all on function public.rag_capture_readside(int) from public, anon, authenticated;
grant execute on function public.rag_capture_readside(int) to service_role;

comment on function public.rag_capture_readside(int) is
  'Read-side capture: scans aria_learning_log / aria_conversations after the fact and records unanswered questions into rag_gaps. Writes NOTHING to rag_chunks, rag_documents or rag_candidates. service_role only — unreachable from any user request path.';

-- ── Schedule ──────────────────────────────────────────────────────────────
-- Guarded: pg_cron may not be installed in every environment, and a missing
-- extension must not fail the migration. Without pg_cron the function is
-- still callable by any external scheduler holding the service role.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('rag-capture-readside');
    exception when others then
      null;  -- not yet scheduled
    end;
    perform cron.schedule(
      'rag-capture-readside',
      '*/15 * * * *',
      $cron$ select public.rag_capture_readside(500); $cron$
    );
  end if;
end $$;
