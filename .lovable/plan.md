# .lovable/plan.md — ARIA continuous gap ledger

_Maintained per **Constitution Article 27** (Continuous Autonomous Gap Closure)._
_Last update: 2026-07-08 — session batches 1–3._

## Ledger

### ✅ Batch 1 — closed
- (26) `aria_actions_log` table + RLS org-scope + RESTRICTIVE tenant isolation
- (26) `logAriaAction()` + `checkRateLimit()` helpers (`src/lib/aria/audit-log.server.ts`)
- (26) `/api/public/hooks/aria-incident` — rate-limited (60/60s/IP) + audit-logged
- (26) Constitution Article 26 added; whitelist extended (`aria_voice_latency_regression`, `aria_corpus_stale`)

### ✅ Batch 2 — closed
- (27) Constitution **Article 27** — continuous autonomous gap closure
- (23) Private storage bucket `aria-attachments` + owner-scoped RLS on `storage.objects`
- (23) `uploadAriaAttachment` server fn (`src/lib/aria/attachments.functions.ts`) — 25 MB cap, MIME allowlist, signed URL 1h
- (25) `aria_documents.source_kind` + `is_official` + `revision_hash` (unique per official URL)
- (25) `public.aria_scan_corpus_stale()` + daily cron `aria-corpus-stale-scan` (03:17 UTC) → opens `aria_corpus_stale` incident when official corpus > 30d
- (26) `public.aria_actions_log_retention()` + daily cron `aria-actions-log-retention` (04:42 UTC) → 90d retention
- (24) `createSentenceFlusher()` + `reportVoiceLatencyRegression()` (`src/lib/aria/stream-sentence-flusher.ts`) — first-sentence budget 250 ms + auto-beacon on breach

### 🔜 Open — high
- (24) Wire `createSentenceFlusher` into `speakAria` / `AriaCopilot` streaming boundary (replace full-reply-then-speak with sentence-by-sentence)
- (23) Wire `uploadAriaAttachment` into `AriaCopilot` "+" button (currently serialises to metadata text only) + attach `signed_url` to the outgoing chat message parts
- (25) RAG binding in chat transport: retrieve from `aria_documents WHERE is_official = true AND source_kind = 'ksa_industrial_security_regulation'` BEFORE `sec_*` for `/sec/*` scoped requests, and attach citations to the answer envelope
- (25) Corpus ingestion job: HCIS / MoI Civil Defence / NCA / SDAIA — idempotent by `(source, revision_hash)`

### 🔜 Open — medium
- (11/26) E2E spec `tests/e2e/12-article-26-rate-limit.spec.ts`: 61st call within 60s → 429 + audit row visible to org owner, hidden from other tenants
- (20) EvidenceBadge legacy sweep: `rg -n '"LIVE"|"SYNC"|بث مباشر|UPTIME|TLS 1\.3' src/routes src/components` and convert every remaining hit
- (multi-tenancy) Retrofit `org_id` + RESTRICTIVE RLS on legacy `sec_*` tables that predate the multi-tenancy migration
- (22) Data-driven narration adapters for dynamic routes (`/sec/incidents/$id`, `/oms/work-orders/$id`) via `setAriaPageContext`

### 🔜 Open — low
- (SEO) Fill missing `og:image` on leaf routes; derive from loader data where a cover exists
- (a11y) Storybook + visual regression for HUD components
- (aria-supreme-prompt) Integrity test bump to 27 articles

## Notes

Batches are executed autonomously per **Article 27 (c)**. The operator is asked only for ambiguity, destructive actions, or external secrets. Every closed gap in a batch is published in the assistant reply's ledger.

## Batch 3 — Attachments wired (2026-07-08)
- AriaCopilot now uploads files via `uploadAriaAttachment` server fn on submit
- Signed URLs appended to outgoing message body; upload state disables send
- Article 23 enforcement now end-to-end (UI → storage → RLS → audit log)

## Batch 4 — RAG regulation grounding (2026-07-08)
- Created `src/lib/aria/rag.functions.ts` with `retrieveRegulationContext`
- Uses OpenAI text-embedding-3-small @ 768 dims (matches vector column)
- Enriches hits from `aria_documents` with is_official/source_kind
- `official_only` filter for KSA industrial-security regulation lookups
- Audit-logged under Article 25; ready to be called from AriaCopilot/SEC panels

## Batch 6 — Voice latency regression beacon (2026-07-08)
- AriaCopilot now fires `reportVoiceLatencyRegression` when first-token → sentence1 > 250ms (Article 24 b)
- Feeds `/api/public/hooks/aria-incident` with device_class + latency detail
- ARIA opens fix session on next turn per Article 27 (e)

## Batch 7 — ARIA maintenance cron (2026-07-08)
- `aria-actions-log-retention` scheduled daily 04:42 UTC → 90-day audit trim
- `aria-corpus-stale-scan` scheduled daily 03:17 UTC → auto-raises `aria_corpus_stale` public incident
- Both jobs idempotent (unschedule-then-schedule)

## Batch 5a — Evidence Gate sweep round 1 (2026-07-08)
- `queryEvidence(source, dataUpdatedAt, value, href?)` added to `src/lib/evidence/gate.ts`
- `_authenticated/dashboard.tsx` header LIVE badge now `<EvidenceBadge>` bound to `getExecKpis` `dataUpdatedAt`
- `_authenticated/live-dashboard.tsx` header LIVE badge now `<EvidenceBadge>` bound to `max(kpis, timeseries).dataUpdatedAt`
- `AgentRoster.tsx` "Live / البث مباشر" now `<EvidenceBadge>` gated by `signals.length` via `probeEvidence`

## Batch 9 — DB hardening (2026-07-08)
- REVOKE EXECUTE from PUBLIC/anon/authenticated on 13 privileged `SECURITY DEFINER` maintenance functions (ARIA retention/corpus scan, Microsoft sync dispatch/secret, runtime cleanup, KPI schedule, email queue dispatch/wake/enqueue/read/delete/dlq, unsubscribe cleanup); only `service_role` + cron keep EXECUTE
- Remaining linter WARNs are pre-existing legitimate signed-in helpers (`has_role`, `is_org_member`, `current_org_id`) that MUST stay callable by `authenticated`


